import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
// Using React Flow only — Tldraw removed
import MembersPanel from '../Panels/MembersPanel';
import FilesPanel from '../Panels/FilesPanel';
import HistoryPanel from '../Panels/HistoryPanel';
import OverviewPanel from '../Panels/OverviewPanel';
import LandingPage from './LandingPage';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import ReactFlowCanvas from '../Canvas/ReactFlowCanvas';

const SOCKET_URL = 'http://localhost:5002';

const TABS = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'overview', label: 'Overview' },
  { id: 'files', label: 'Files' },
  { id: 'members', label: 'Members' },
  { id: 'history', label: 'History' },
];

export default function RoomWorkspace() {
  const { activeRoom, activeTab, setActiveTab } = useRoom();
  const { user } = useAuth();
  const { toast, ToastContainer } = useToast();
  const socketRef = useRef(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const currentUserId = user?._id || user?.id || null;
  const currentUserName = user?.name || 'User';
  // React Flow only

  useEffect(() => {
    if (!activeRoom || !currentUserId) {
      if (activeRoom && !currentUserId) {
        console.warn('Workspace socket skipped because userId is missing', {
          roomId: activeRoom._id,
          user,
        });
      }
      return;
    }

    const socket = io(SOCKET_URL, { transports: ['websocket'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Workspace socket connected', {
        socketId: socket.id,
        roomId: activeRoom._id,
        userId: currentUserId,
      });

      if (!currentUserId) {
        console.warn('Skipping workspace presence-join because userId is missing', {
          roomId: activeRoom._id,
          user,
        });
        return;
      }

      socket.emit('presence-join', {
        userId: currentUserId,
        roomId: activeRoom._id,
        userName: currentUserName,
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Workspace socket connect_error', {
        message: error?.message,
        roomId: activeRoom._id,
        userId: currentUserId,
      });
    });

    socket.on('error', (error) => {
      console.error('Workspace socket error', error);
    });

    socket.on('presence-update', (users = []) => {
      setRemoteUsers(Array.isArray(users) ? users : []);
    });

    return () => {
      console.log('Workspace socket disconnect requested', {
        roomId: activeRoom._id,
        userId: currentUserId,
      });
      try { socket.disconnect(); } catch (error) {
        console.warn('Failed to disconnect workspace socket cleanly', error);
      }
      socketRef.current = null;
      setRemoteUsers([]);
    };
  }, [activeRoom, currentUserId, currentUserName, user]);

  if (!activeRoom) {
    return <LandingPage />;
  }

  return (
    <div style={styles.workspace}>
      {/* Topbar */}
      <div style={styles.topbar}>
        <div>
          <div style={styles.roomTitle}>{activeRoom.name}</div>
          {activeRoom.description && (
            <div style={styles.roomDesc}>{activeRoom.description}</div>
          )}
        </div>
        <div style={styles.topbarRight}>
          {/* React Flow only — no canvas toggle */}
          {remoteUsers.slice(0, 6).map((u) => (
            <div key={u.socketId} style={styles.topbarAvatar} title={u.userName}>
              {(u.userName || 'U').charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'canvas' && (
          <ReactFlowCanvas roomId={activeRoom._id} userId={currentUserId} onToast={toast} />
        )}
        {activeTab === 'overview' && (
          <div style={styles.scrollable}>
            <OverviewPanel room={activeRoom} onSwitchTab={setActiveTab} />
          </div>
        )}
        {activeTab === 'files' && (
          <div style={styles.scrollable}>
            <FilesPanel roomId={activeRoom._id} onToast={toast} />
          </div>
        )}
        {activeTab === 'members' && (
          <div style={styles.scrollable}>
            <MembersPanel roomId={activeRoom._id} onToast={toast} />
          </div>
        )}
        {activeTab === 'history' && (
          <div style={styles.scrollable}>
            <HistoryPanel roomId={activeRoom._id} />
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}

const styles = {
  workspace: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' },
  topbar: {
    height: 'var(--header-h)', borderBottom: '0.5px solid var(--border-tertiary)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', flexShrink: 0,
  },
  roomTitle: { fontSize: 14, fontWeight: 600 },
  roomDesc: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 8 },
  topbarAvatar: { width: 28, height: 28, borderRadius: 999, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' },
  tabBar: {
    display: 'flex', borderBottom: '0.5px solid var(--border-tertiary)',
    padding: '0 20px', flexShrink: 0,
    background: 'var(--bg-primary)',
  },
  tab: {
    padding: '10px 14px', fontSize: 13, cursor: 'pointer',
    color: 'var(--text-secondary)',
    background: 'none', border: 'none', outline: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    transition: 'color var(--t-base), border-color var(--t-base)',
    fontFamily: 'var(--font-sans)', fontWeight: 400,
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: 'var(--text-primary)', fontWeight: 500,
    borderBottomColor: 'var(--brand)',
  },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  scrollable: { flex: 1, overflowY: 'auto' },
  empty: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-secondary)',
  },
  emptyInner: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16,
    background: 'var(--bg-primary)', border: '0.5px solid var(--border-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--brand)', marginBottom: 4,
    boxShadow: 'var(--shadow-sm)',
  },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' },
  emptySub: { fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280, lineHeight: 1.5 },
};
