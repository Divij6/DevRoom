import { useState, useEffect } from 'react';
import { getHistory } from '../../services/api';

const AV_COLORS = ['av-purple', 'av-teal', 'av-coral', 'av-amber', 'av-blue'];
const avatarClass = (name = '') => AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length];
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'yesterday';
  return `${Math.floor(hrs / 24)}d ago`;
}

function actionLabel(entry) {
  const type = entry.action || entry.type || 'update';
  switch (type) {
    case 'canvas_save': return 'Saved canvas snapshot';
    case 'node_create': return `Added node: ${entry.meta?.title || 'Untitled'}`;
    case 'file_upload': return `Uploaded ${entry.meta?.fileName || 'file'}`;
    case 'member_invite': return `Invited ${entry.meta?.email || 'member'}`;
    case 'member_remove': return `Removed member`;
    case 'edge_create': return 'Connected two nodes';
    case 'note_create': return 'Added sticky note';
    default: return entry.message || type;
  }
}

export default function HistoryPanel({ roomId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory(roomId)
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [roomId]);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>Version history</h2>
        <p style={styles.sub}>Every canvas change, file upload, and team action — from day one.</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🕐</div>
          <div className="empty-state-title">No activity yet</div>
          <div className="empty-state-sub">Actions in this room will appear here</div>
        </div>
      ) : (
        <div style={styles.timeline}>
          {history.map((entry, i) => {
            const name = entry.userId?.name || entry.actor || 'Unknown';
            const isLast = i === history.length - 1;
            return (
              <div key={entry._id || i} style={styles.commitItem}>
                {/* Left column: dot + trail */}
                <div style={styles.commitLine}>
                  <div style={{
                    ...styles.commitDot,
                    background: i === 0 ? 'var(--brand)' : 'var(--border-primary)',
                    boxShadow: i === 0 ? '0 0 0 2px var(--brand-alpha)' : 'none',
                  }} />
                  {!isLast && <div style={styles.commitTrail} />}
                </div>
                {/* Right column: content */}
                <div style={styles.commitBody}>
                  <div style={styles.commitMsg}>{actionLabel(entry)}</div>
                  <div style={styles.commitDetail}>
                    <span className={`avatar ${avatarClass(name)}`}
                      style={{ width: 16, height: 16, fontSize: 8, display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>
                      {initials(name)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                    <span style={{ margin: '0 4px', color: 'var(--border-primary)' }}>·</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>{timeAgo(entry.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.infoBox}>
        <div style={styles.infoTitle}>History is always accessible</div>
        <div style={styles.infoText}>
          New members can scroll the full history from day one — every canvas change, file upload, and action from the start.
        </div>
      </div>
    </div>
  );
}

const styles = {
  panel: { padding: 24, maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: {},
  title: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  sub: { fontSize: 13, color: 'var(--text-secondary)' },
  timeline: { display: 'flex', flexDirection: 'column' },
  commitItem: { display: 'flex', gap: 14 },
  commitLine: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0, paddingTop: 3 },
  commitDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  commitTrail: { flex: 1, width: 1.5, background: 'var(--border-tertiary)', minHeight: 24, margin: '3px 0' },
  commitBody: { flex: 1, paddingBottom: 16 },
  commitMsg: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.4 },
  commitDetail: { fontSize: 11, display: 'flex', alignItems: 'center' },
  infoBox: {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: 14, marginTop: 4,
  },
  infoTitle: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
  infoText: { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 },
};