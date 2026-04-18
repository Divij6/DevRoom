import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import CreateRoomModal from './CreateRoomModal';
import { updateRoom, deleteRoom, getRooms } from '../../services/api';

const DOT_COLORS = ['dot-purple', 'dot-green', 'dot-amber', 'dot-blue', 'dot-gray'];
const AV_COLORS = ['av-purple', 'av-teal', 'av-coral', 'av-amber', 'av-blue'];

function avatarClass(name = '') {
  const safeName = name || 'U';
  const idx = safeName.charCodeAt(0) % AV_COLORS.length;
  return AV_COLORS[idx];
}

function initials(name = '') {
  if (!name) {
    return 'U';
  }

  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { rooms, roomsLoading, activeRoom, openRoom, loadRooms } = useRoom();
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, mode: 'rename', room: null, form: { name: '', description: '' } });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, room: null });

  const safeRooms = Array.isArray(rooms) ? rooms : [];

  const handleRoomCreated = (room) => {
    if (room) {
      openRoom(room);
    }

    setShowCreate(false);
  };

  const openMenu = (e, room) => {
    e.stopPropagation();
    setMenuOpen((cur) => (cur === room._id ? null : room._id));
  };

  const openEditModal = (room, mode) => {
    setMenuOpen(null);
    setEditModal({ open: true, mode, room, form: { name: room.name || '', description: room.description || '' } });
  };

  const handleUpdateRoom = async () => {
    try {
      const { room, form } = editModal;
      await updateRoom(room._id, { name: form.name, description: form.description });
      // reload rooms and keep the updated room active
      await loadRooms();
      const res = await getRooms();
      const nextRooms = res.data?.rooms || [];
      const updated = nextRooms.find((r) => r._id === room._id) || null;
      openRoom(updated);
    } catch (e) {
      console.warn('Update room failed', e);
    } finally {
      setEditModal({ open: false, mode: 'rename', room: null, form: { name: '', description: '' } });
    }
  };

  const confirmDeleteRoom = (room) => {
    setMenuOpen(null);
    setDeleteConfirm({ open: true, room });
  };

  const handleDeleteRoom = async () => {
    const room = deleteConfirm.room;
    if (!room) return;
    try {
      await deleteRoom(room._id);
      // refresh list
      await loadRooms();
      const res = await getRooms();
      const nextRooms = res.data?.rooms || [];
      if (nextRooms.length > 0) {
        openRoom(nextRooms[0]);
      } else {
        openRoom(null);
      }
    } catch (e) {
      console.warn('Failed to delete room', e);
    } finally {
      setDeleteConfirm({ open: false, room: null });
    }
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoIcon}>
          <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
            <rect x="1" y="1" width="4" height="4" rx="1" fill="white" opacity="0.9" />
            <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.6" />
            <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.6" />
            <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.3" />
          </svg>
        </div>
        <span style={styles.logoText}>DevRoom</span>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>Rooms</span>
          <button style={styles.addBtn} onClick={() => setShowCreate(true)} title="New room">+</button>
        </div>

        <div style={styles.roomList}>
          {roomsLoading && <p style={styles.emptyRooms}>Loading rooms...</p>}

          {!roomsLoading && safeRooms.length === 0 && (
            <p style={styles.emptyRooms}>No rooms yet.<br />Create your first room.</p>
          )}

          {safeRooms.map((room, i) => (
            <div
              key={room._id}
              style={{
                ...styles.roomItem,
                ...(activeRoom?._id === room._id ? styles.roomItemActive : {}),
                position: 'relative',
              }}
              onClick={() => openRoom(room)}
            >
              <span className={`dot ${DOT_COLORS[i % DOT_COLORS.length]}`} />
              <span style={styles.roomName}>{room.name}</span>
              <button
                onClick={(e) => openMenu(e, room)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 6 }}
                title="Room options"
              >
                ⋮
              </button>

              {menuOpen === room._id && (
                <div style={{ position: 'absolute', right: 8, top: '100%', zIndex: 60 }} onMouseLeave={() => setMenuOpen(null)}>
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 8, boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ padding: 8, cursor: 'pointer' }} onClick={() => openEditModal(room, 'rename')}>Rename</div>
                    <div style={{ padding: 8, cursor: 'pointer' }} onClick={() => openEditModal(room, 'description')}>Edit description</div>
                    <div style={{ padding: 8, cursor: 'pointer', color: '#dc2626' }} onClick={() => confirmDeleteRoom(room)}>Delete</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.userArea}>
        <div style={styles.userRow} onClick={logout} title="Sign out">
          <div className={`avatar ${avatarClass(user?.name)}`}>{initials(user?.name)}</div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userAction}>Sign out</div>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={handleRoomCreated}
        />
      )}
      {editModal.open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setEditModal({ open: false, mode: 'rename', room: null, form: { name: '', description: '' } })}>
          <div className="modal">
            <h2 className="modal-title">{editModal.mode === 'rename' ? 'Rename room' : 'Edit description'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateRoom(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {editModal.mode === 'rename' && (
                <div>
                  <label className="label">Room name</label>
                  <input className="input" value={editModal.form.name} onChange={(e) => setEditModal((s) => ({ ...s, form: { ...s.form, name: e.target.value } }))} required />
                </div>
              )}
              {editModal.mode === 'description' && (
                <div>
                  <label className="label">Description</label>
                  <input className="input" value={editModal.form.description} onChange={(e) => setEditModal((s) => ({ ...s, form: { ...s.form, description: e.target.value } }))} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal({ open: false, mode: 'rename', room: null, form: { name: '', description: '' } })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm.open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm({ open: false, room: null })}>
          <div className="modal">
            <h2 className="modal-title">Delete room</h2>
            <p>Are you sure you want to archive this room? This action can be undone by an owner.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm({ open: false, room: null })}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteRoom}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-w)',
    background: 'var(--bg-secondary)',
    borderRight: '0.5px solid var(--border-tertiary)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
  },
  logo: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '0.5px solid var(--border-tertiary)',
  },
  logoIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    background: '#534AB7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  section: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 0 4px' },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px 6px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  addBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    fontSize: 16,
    lineHeight: 1,
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    transition: 'background var(--t-base), color var(--t-base)',
  },
  roomList: { flex: 1, overflowY: 'auto', padding: '0 6px' },
  emptyRooms: { fontSize: 12, color: 'var(--text-tertiary)', padding: '10px 10px', lineHeight: 1.5 },
  roomItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px',
    borderRadius: 6,
    margin: '1px 0',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background var(--t-base)',
    color: 'var(--text-primary)',
  },
  roomItemActive: { background: 'var(--bg-primary)', fontWeight: 500 },
  roomName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userArea: { borderTop: '0.5px solid var(--border-tertiary)', padding: 10 },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background var(--t-base)',
  },
  userInfo: { flex: 1, overflow: 'hidden' },
  userName: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userAction: { fontSize: 11, color: 'var(--text-tertiary)' },
};
