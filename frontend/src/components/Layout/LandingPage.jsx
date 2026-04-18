import React from 'react';
import { useRoom } from '../../context/RoomContext';

export default function LandingPage() {
  const { createRoom } = useRoom();

  const handleCreate = async () => {
    // create a quick starter room
    await createRoom({ name: 'New DevRoom' });
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to DevRoom</h1>
        <p style={styles.lead}>
          Collaborative whiteboards for teams — sketch, plan, and ship together.
        </p>

        <div style={styles.ctas}>
          <button className="btn btn-primary" onClick={handleCreate}>Create a room</button>
          <a style={styles.learn} href="#" onClick={(e) => e.preventDefault()}>Learn more</a>
        </div>

        <div style={styles.infoRow}>
          <div style={styles.infoItem}>
            <strong>Realtime</strong>
            <div style={styles.infoSub}>See collaborators live</div>
          </div>
          <div style={styles.infoItem}>
            <strong>Files</strong>
            <div style={styles.infoSub}>Attach files and versions</div>
          </div>
          <div style={styles.infoItem}>
            <strong>History</strong>
            <div style={styles.infoSub}>Track every change</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' },
  card: { width: 720, padding: 36, borderRadius: 12, boxShadow: 'var(--shadow-sm)', border: '0.5px solid var(--border-tertiary)', background: 'var(--bg-secondary)', textAlign: 'center' },
  title: { fontSize: 28, margin: 0, color: 'var(--text-primary)' },
  lead: { fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 18 },
  ctas: { display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  learn: { color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' },
  infoRow: { display: 'flex', gap: 18, justifyContent: 'center', marginTop: 6 },
  infoItem: { textAlign: 'center' },
  infoSub: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }
};
