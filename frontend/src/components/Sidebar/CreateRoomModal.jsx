import { useState } from 'react';
import { useRoom } from '../../context/RoomContext';

export default function CreateRoomModal({ onClose, onCreated }) {
  const { createRoom } = useRoom();
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const room = await createRoom({
        name: form.name.trim(),
        description: form.description.trim(),
      });

      onCreated?.(room);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">New room</h2>
        <p className="modal-sub">Create a shared workspace for your team</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Room name</label>
            <input
              className="input"
              placeholder="e.g. Auth Service"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">
              Description <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
            </label>
            <input
              className="input"
              placeholder="What is this room for?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Create room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
