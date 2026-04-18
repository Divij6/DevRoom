import { useState, useEffect } from 'react';
import { getFiles, getHistory, getMembers } from '../../services/api';

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
  return `${Math.floor(hrs / 24)}d ago`;
}

const FILE_ICONS = { ts: '📄', js: '📄', jsx: '📄', sql: '🗄', json: '📋', md: '📝', default: '📦' };
const fileIcon = (name = '') => FILE_ICONS[name.split('.').pop().toLowerCase()] || FILE_ICONS.default;

export default function OverviewPanel({ room, onSwitchTab }) {
  const [files, setFiles] = useState([]);
  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!room?._id) return;
    getFiles(room._id).then(r => setFiles((r.data || []).slice(0, 6))).catch(() => {});
    getMembers(room._id).then(r => setMembers(r.data?.members || [])).catch(() => {});
    getHistory(room._id).then(r => setHistory((r.data || []).slice(0, 4))).catch(() => {});
  }, [room?._id]);

  return (
    <div style={styles.panel}>
      {/* Stats row */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{members.length}</div>
          <div style={styles.statLabel}>Members</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{files.length}</div>
          <div style={styles.statLabel}>Files</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{history.length}</div>
          <div style={styles.statLabel}>Activities</div>
        </div>
      </div>

      <div style={styles.columns}>
        {/* Recent files */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Recent files</span>
            <span style={styles.sectionLink} onClick={() => onSwitchTab('files')}>View all →</span>
          </div>
          {files.length === 0 ? (
            <p style={styles.empty}>No files yet</p>
          ) : (
            <div style={styles.fileGrid}>
              {files.map(f => (
                <div key={f._id} style={styles.fileCard}>
                  <div style={styles.fileIcon}>{fileIcon(f.fileName)}</div>
                  <div style={styles.fileName}>{f.fileName}</div>
                  <div style={styles.fileMeta}>{timeAgo(f.updatedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team members */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Team</span>
            <span style={styles.sectionLink} onClick={() => onSwitchTab('members')}>Manage →</span>
          </div>
          {members.map(m => {
            const name = m.userId?.name || 'Unknown';
            return (
              <div key={m.userId?._id} style={styles.memberRow}>
                <div className={`avatar ${avatarClass(name)}`}>{initials(name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.userId?.email || ''}</div>
                </div>
                <span className={`badge ${m.role === 'owner' ? 'badge-purple' : 'badge-gray'}`}>{m.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Recent activity</span>
          <span style={styles.sectionLink} onClick={() => onSwitchTab('history')}>Full history →</span>
        </div>
        {history.length === 0 ? (
          <p style={styles.empty}>No activity yet</p>
        ) : history.map((entry, i) => (
          <div key={entry._id || i} style={styles.activityRow}>
            <div style={{ ...styles.actDot, background: i === 0 ? 'var(--brand)' : 'var(--border-primary)' }} />
            <div style={{ flex: 1, fontSize: 13 }}>
              {entry.message || entry.action || 'Activity'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(entry.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  panel: { padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  statsRow: { display: 'flex', gap: 12 },
  statCard: {
    flex: 1, background: 'var(--bg-primary)',
    border: '0.5px solid var(--border-tertiary)',
    borderRadius: 'var(--radius-md)', padding: '14px 16px',
  },
  statNum: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' },
  statLabel: { fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 },
  columns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  section: {
    background: 'var(--bg-primary)', border: '0.5px solid var(--border-tertiary)',
    borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
  },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 600 },
  sectionLink: { fontSize: 12, color: 'var(--brand)', cursor: 'pointer' },
  empty: { fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' },
  fileGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  fileCard: {
    display: 'flex', flexDirection: 'column', gap: 3,
    padding: '10px 10px', borderRadius: 6,
    background: 'var(--bg-secondary)', fontSize: 12,
  },
  fileIcon: { fontSize: 16 },
  fileName: { fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileMeta: { fontSize: 11, color: 'var(--text-tertiary)' },
  memberRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 0', borderBottom: '0.5px solid var(--border-tertiary)',
  },
  activityRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 0', borderBottom: '0.5px solid var(--border-tertiary)',
  },
  actDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
};
