import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';

import TemplateSidebar from '../Sidebar/TemplateSidebar';
import {
  getCanvas, saveCanvas, getNodeFiles, getFileLink,
  createNote, updateNote, createEdge, createNode,
  updateNode, deleteNode, deleteEdge, deleteNote,
  getFileContent, getFileVersions, updateFileContent,
} from '../../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import FileEditorModal from '../Panels/FileEditorModal';

const DEFAULT_W = 160;
const DEFAULT_H = 80;
const SOCKET_URL = 'http://localhost:5002';

// Soft palette for remote cursors
const CURSOR_COLORS = [
  '#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6',
  '#ef4444','#8b5cf6','#14b8a6','#f97316','#84cc16',
];
function colorForUser(id) {
  let hash = 0;
  for (let i = 0; i < (id || '').length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

function templateColorToStyle(type) {
  const map = {
    frontend:  { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a5f' },
    backend:   { bg: '#dcfce7', border: '#22c55e', text: '#14532d' },
    database:  { bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
    service:   { bg: '#ede9fe', border: '#8b5cf6', text: '#3b0764' },
    jwt:       { bg: '#fef9c3', border: '#eab308', text: '#713f12' },
    queue:     { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
    cache:     { bg: '#d1fae5', border: '#10b981', text: '#064e3b' },
    gateway:   { bg: '#e0f2fe', border: '#0ea5e9', text: '#0c4a6e' },
  };
  return map[type] || { bg: '#f1f5f9', border: '#94a3b8', text: '#1e293b' };
}

const makeTempId = () => `shape:temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/* ─── NOTE NODE ─────────────────────────────────────────────────────────── */
function NoteNode({ id, data, selected }) {
  const [draftText, setDraftText] = useState(data?.label || '');
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef(null);
  const rf = useReactFlow();

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setDraftText(data?.label || '');
    setEditing(true);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setDraftText(val);
    if (data?.onChange) data.onChange(id, val);
    else rf.setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: val } } : n));
  };

  const commit = () => {
    setEditing(false);
    if (data?.onPersist) data.onPersist(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') commit();
    // Ctrl/Cmd + Enter also commits
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') commit();
    e.stopPropagation();
  };

  const renderedText = editing ? draftText : (data?.label || '');
  const noteW = data?.width || 180;
  const noteH = data?.height || 110;

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        width: noteW,
        height: noteH,
        background: 'linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)',
        borderRadius: 10,
        boxShadow: selected
          ? '0 0 0 2px #f59e0b, 0 8px 24px rgba(0,0,0,0.12)'
          : '0 2px 8px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        border: selected ? '1.5px solid #f59e0b' : '1px solid #fde68a',
        padding: 10,
        cursor: editing ? 'text' : 'default',
        position: 'relative',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Pin icon */}
      <div style={{ position: 'absolute', top: 7, right: 9, fontSize: 12, opacity: 0.45, userSelect: 'none' }}>📌</div>

      {/* Drag handle line */}
      <div style={{ width: 28, height: 3, background: '#d4b483', borderRadius: 99, marginBottom: 6, marginLeft: 1, opacity: 0.55 }} />

      {editing ? (
        <textarea
          ref={textareaRef}
          className="nodrag"
          value={renderedText}
          onChange={handleChange}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Type your note…"
          style={{
            flex: 1,
            border: 'none',
            resize: 'none',
            outline: 'none',
            background: 'transparent',
            color: '#4a3728',
            fontSize: 13,
            lineHeight: 1.55,
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: renderedText ? '#4a3728' : '#b8a98a',
            fontSize: 13,
            lineHeight: 1.55,
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          {renderedText || 'Double-click to edit…'}
        </div>
      )}

      {editing && (
        <div style={{ fontSize: 10, color: '#a0936e', marginTop: 4, textAlign: 'right' }}>
          Ctrl+Enter or click outside to save
        </div>
      )}
    </div>
  );
}

/* ─── DEFAULT NODE ──────────────────────────────────────────────────────── */
function NodeWithHandles({ data, selected }) {
  const colors = templateColorToStyle(data?.type);
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        background: colors.bg,
        border: selected ? `2px solid ${colors.border}` : `1.5px solid ${colors.border}`,
        minWidth: data?.width || DEFAULT_W,
        minHeight: data?.height || DEFAULT_H,
        boxShadow: selected
          ? `0 0 0 3px ${colors.border}33, 0 6px 18px rgba(0,0,0,0.10)`
          : '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
    >
      <Handle type="target" id="top"    position="top"    style={{ top: -7,    left: '50%', transform: 'translateX(-50%)', background: colors.border, width: 10, height: 10, border: '2px solid #fff' }} />
      <Handle type="target" id="left"   position="left"   style={{ left: -7,   top: '50%',  transform: 'translateY(-50%)', background: colors.border, width: 10, height: 10, border: '2px solid #fff' }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, textAlign: 'center', pointerEvents: 'auto', wordBreak: 'break-word' }}>
        {data?.label || 'Node'}
      </div>
      <Handle type="source" id="right"  position="right"  style={{ right: -7,  top: '50%',  transform: 'translateY(-50%)', background: colors.border, width: 10, height: 10, border: '2px solid #fff' }} />
      <Handle type="source" id="bottom" position="bottom" style={{ bottom: -7, left: '50%', transform: 'translateX(-50%)', background: colors.border, width: 10, height: 10, border: '2px solid #fff' }} />
    </div>
  );
}


/* ─── CURSOR SVG ────────────────────────────────────────────────────────── */
function CursorIcon({ color }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L1 17L5.5 12.5L8.5 20L11 19L8 12H14.5L1 1Z" fill={color} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── MAIN COMPONENT ────────────────────────────────────────────────────── */
export default function ReactFlowCanvas({ roomId, userId, onToast }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const flowWrapper = useRef(null);
  const { user } = useAuth();
  const currentUserId = userId || user?._id || user?.id || null;
  const currentUserName = user?.name || 'User';
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const socketRef = useRef(null);
  const lastEmitRef = useRef(0);
  const lastDragEmitRef = useRef(0);
  const tooltipHideRef = useRef(null);
  const [remoteCursors, setRemoteCursors] = useState({});

  const [hoverFiles, setHoverFiles] = useState([]);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerSaving, setViewerSaving] = useState(false);
  const nodeTypes = useMemo(() => ({ note: NoteNode, defaultNode: NodeWithHandles }), []);
  const resolveFileContent = useCallback((payload) => (
    payload?.content
    ?? payload?.file?.content
    ?? payload?.file?.fileContent
    ?? payload?.fileContent
    ?? ''
  ), []);

  const loadViewerFile = useCallback(async (fileId, fallbackFile = {}) => {
    const [metaRes, contentRes, versionsRes] = await Promise.all([
      getFileLink(fileId),
      getFileContent(fileId),
      getFileVersions(fileId),
    ]);

    const resolvedContent = resolveFileContent(contentRes.data);

    return {
      ...fallbackFile,
      ...metaRes.data,
      _id: metaRes.data?.fileId || fallbackFile._id || fileId,
      content: resolvedContent,
      updatedAt: metaRes.data?.updatedAt ?? contentRes.data?.updatedAt ?? fallbackFile.updatedAt,
      versions: Array.isArray(versionsRes.data) ? versionsRes.data : [],
    };
  }, [resolveFileContent]);

  /* ── Note text helpers ── */
  const updateNoteText = useCallback((nodeId, text) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, label: text } } : n));
  }, [setNodes]);

  const persistNote = useCallback(async (nodeId) => {
    setNodes((current) => {
      const nodeObj = current.find((n) => n.id === nodeId);
      if (!nodeObj) return current;
      const text = String(nodeObj.data?.label || '').trim();
      if (!text) return current;

      (async () => {
        try {
          if (String(nodeId).startsWith('note:')) {
            const dbId = String(nodeId).split(':')[1];
            await updateNote(dbId, { text, position: { x: Math.round(nodeObj.position.x), y: Math.round(nodeObj.position.y) } });
          } else {
            const res = await createNote({ text, position: { x: Math.round(nodeObj.position.x), y: Math.round(nodeObj.position.y) }, roomId, createdBy: currentUserId });
            const createdId = res?.data?.noteId;
            if (createdId) {
              setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, id: `note:${createdId}` } : n));
            }
          }
        } catch (err) {
          console.error('persistNote error', err);
        }
      })();
      return current;
    });
  }, [setNodes, roomId, currentUserId]);

  /* ── Enrich nodes with callbacks ── */
  const enrichNoteData = useCallback((rawData) => ({
    ...rawData,
    onChange: updateNoteText,
    onPersist: persistNote,
  }), [updateNoteText, persistNote]);

  useEffect(() => () => {
    if (tooltipHideRef.current) clearTimeout(tooltipHideRef.current);
  }, []);

  /* ── Load canvas ── */
  useEffect(() => {
    if (!roomId) { setNodes([]); setEdges([]); return; }

    getCanvas(roomId)
      .then((res) => {
        const data = res.data || {};
        const loadedNodes = [
          ...(data.nodes || []).map((n) => ({
            id: `shape:${n._id}`,
            position: { x: n.position?.x ?? 100, y: n.position?.y ?? 100 },
            data: { label: n.title, type: n.type, background: templateColorToStyle(n.type).bg },
            style: { width: n.width || DEFAULT_W, height: n.height || DEFAULT_H },
            type: 'defaultNode',
          })),
          ...(data.notes || []).map((note) => ({
            id: `note:${note._id}`,
            position: { x: note.position?.x ?? 120, y: note.position?.y ?? 120 },
            data: enrichNoteData({ label: note.text, width: 180, height: 110 }),
            type: 'note',
          })),
        ];
        const loadedEdges = (data.edges || []).map((e) => ({
          id: `edge:${e._id}`,
          source: `shape:${e.sourceNodeId}`,
          target: `shape:${e.targetNodeId}`,
          type: 'default',
          style: { stroke: '#94a3b8', strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed', color: '#94a3b8' },
        }));
        setNodes(loadedNodes);
        setEdges(loadedEdges);
      })
      .catch((error) => {
        console.error('Failed to load canvas', error);
      });
  }, [roomId, enrichNoteData, setEdges, setNodes]);

  /* ── Socket / presence / real-time ── */
  useEffect(() => {
    if (!roomId || !currentUserId) {
      if (roomId && !currentUserId) {
        console.warn('Canvas socket skipped because userId is missing', {
          roomId,
          user,
        });
      }
      setRemoteCursors({});
      return;
    }

    const socket = io(SOCKET_URL, { transports: ['websocket'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Canvas socket connected', {
        socketId: socket.id,
        roomId,
        userId: currentUserId,
      });

      if (!currentUserId) {
        console.warn('Skipping canvas presence-join because userId is missing', {
          roomId,
          user,
        });
        return;
      }

      socket.emit('presence-join', {
        userId: currentUserId,
        roomId,
        userName: currentUserName,
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connect_error in canvas', {
        message: error?.message,
        roomId,
        userId: currentUserId,
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error in canvas', error);
    });

    socket.on('cursor-update', (cursor) => {
      setRemoteCursors((cur) => ({ ...cur, [cursor.socketId]: cursor }));
    });

    socket.on('cursor-remove', ({ socketId }) => {
      setRemoteCursors((cur) => { const n = { ...cur }; delete n[socketId]; return n; });
    });

    socket.on('node-created', (node) => {
      const n = {
        id: `shape:${node._id}`,
        position: { x: node.position.x, y: node.position.y },
        data: { label: node.title, type: node.type },
        style: { width: node.width || DEFAULT_W, height: node.height || DEFAULT_H },
        type: 'defaultNode',
      };
      setNodes((cur) => [...cur.filter((x) => x.id !== n.id), n]);
    });

    socket.on('node-updated', (node) => {
      setNodes((cur) => cur.map((x) =>
        x.id === `shape:${node._id}`
          ? { ...x, position: { x: node.position.x, y: node.position.y }, data: { ...x.data, label: node.title } }
          : x
      ));
    });

    socket.on('node-deleted', ({ nodeId }) => {
      setNodes((cur) => cur.filter((x) => x.id !== `shape:${nodeId}`));
    });

    socket.on('node-drag', ({ nodeId, x, y }) => {
      if (!nodeId || typeof x !== 'number' || typeof y !== 'number') return;
      setNodes((cur) => cur.map((node) => (
        node.id === `shape:${nodeId}`
          ? { ...node, position: { x, y } }
          : node
      )));
    });

    socket.on('edge-created', (edge) => {
      const e = {
        id: `edge:${edge._id}`,
        source: `shape:${edge.sourceNodeId}`,
        target: `shape:${edge.targetNodeId}`,
        type: 'default',
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        markerEnd: { type: 'arrowclosed', color: '#94a3b8' },
      };
      setEdges((cur) => [...cur.filter((x) => x.id !== e.id), e]);
    });

    socket.on('edge-deleted', ({ edgeId }) => {
      setEdges((cur) => cur.filter((x) => x.id !== `edge:${edgeId}`));
    });

    socket.on('note-created', (note) => {
      setNodes((cur) => {
        if (cur.find((x) => x.id === `note:${note._id}`)) return cur;
        return [...cur, {
          id: `note:${note._id}`,
          position: { x: note.position.x, y: note.position.y },
          data: enrichNoteData({ label: note.text, width: 180, height: 110 }),
          type: 'note',
        }];
      });
    });

    socket.on('note-updated', (note) => {
      setNodes((cur) => cur.map((x) =>
        x.id === `note:${note._id}`
          ? { ...x, data: { ...x.data, label: note.text } }
          : x
      ));
    });

    socket.on('note-drag', ({ noteId, x, y }) => {
      if (!noteId || typeof x !== 'number' || typeof y !== 'number') return;
      setNodes((cur) => cur.map((node) => (
        node.id === `note:${noteId}`
          ? { ...node, position: { x, y } }
          : node
      )));
    });

    socket.on('disconnect', (reason) => {
      console.warn('Canvas socket disconnected', { reason, roomId, userId: currentUserId });
      setRemoteCursors({});
    });

    return () => {
      try { socket.disconnect(); } catch (error) {
        console.warn('Failed to disconnect canvas socket cleanly', error);
      }
      socketRef.current = null;
      setRemoteCursors({});
    };
  }, [roomId, currentUserId, currentUserName, user, enrichNoteData, setEdges, setNodes]);

  /* ── Mouse move → emit cursor ── */
  const handleMouseMove = useCallback((event) => {
    const socket = socketRef.current;
    const bounds = flowWrapper.current?.getBoundingClientRect();
    if (!socket || !bounds || !roomId || !currentUserId) return;
    const now = Date.now();
    if (now - lastEmitRef.current < 40) return; // ~25fps
    lastEmitRef.current = now;
    socket.emit('cursor-move', {
      userId: currentUserId, roomId,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      userName: currentUserName,
    });
  }, [roomId, currentUserId, currentUserName]);

  const handleNodeDrag = useCallback((event, node) => {
    void event;
    const socket = socketRef.current;
    if (!socket || !roomId || !node?.id) return;

    const now = Date.now();
    if (now - lastDragEmitRef.current < 40) return;
    lastDragEmitRef.current = now;

    if (String(node.id).startsWith('shape:')) {
      const nodeId = String(node.id).split(':')[1];
      if (!nodeId || nodeId.startsWith('temp_')) return;
      socket.emit('node-drag', {
        roomId,
        nodeId,
        x: node.position.x,
        y: node.position.y,
      });
      return;
    }

    if (String(node.id).startsWith('note:')) {
      const noteId = String(node.id).split(':')[1];
      if (!noteId || noteId.startsWith('temp_')) return;
      socket.emit('note-drag', {
        roomId,
        noteId,
        x: node.position.x,
        y: node.position.y,
      });
    }
  }, [roomId]);

  /* ── Drag stop → persist position ── */
  const onNodeDragStop = useCallback(async (event, node) => {
    void event;
    try {
      if (String(node.id).startsWith('shape:')) {
        const id = String(node.id).split(':')[1];
        await updateNode(id, { position: { x: Math.round(node.position.x), y: Math.round(node.position.y) } });
      }
      if (String(node.id).startsWith('note:')) {
        const id = String(node.id).split(':')[1];
        await updateNote(id, { position: { x: Math.round(node.position.x), y: Math.round(node.position.y) } });
      }
    } catch (err) {
      console.warn('Failed to persist node position', err);
    }
  }, []);

  /* ── File tooltip ── */
  const fetchNodeFiles = useCallback(async (nodeDbId, clientX, clientY) => {
    if (!nodeDbId) return;
    try {
      const res = await getNodeFiles(nodeDbId);
      const links = Array.isArray(res.data) ? res.data : [];
      const files = (await Promise.all(links.map(async (link) => {
        try { const f = await getFileLink(link.fileId); return { ...f.data, linkId: link._id }; }
        catch { return null; }
      }))).filter(Boolean);
      setHoverFiles(files);
      const bounds = flowWrapper.current?.getBoundingClientRect();
      if (bounds) setTooltipPos({ x: clientX - bounds.left + 8, y: clientY - bounds.top + 8 });
      setShowTooltip(true);
    } catch { setHoverFiles([]); setShowTooltip(false); }
  }, []);

  const handleNodeMouseEnter = useCallback((event, node) => {
    if (tooltipHideRef.current) {
      clearTimeout(tooltipHideRef.current);
      tooltipHideRef.current = null;
    }
    const id = node?.id || '';
    if (!id.startsWith('shape:')) return;
    const dbId = id.split(':')[1];
    if (!dbId || dbId.startsWith('temp_')) return;
    fetchNodeFiles(dbId, event.clientX, event.clientY);
  }, [fetchNodeFiles]);

  const handleNodeMouseMove = useCallback((event) => {
    if (tooltipHideRef.current) {
      clearTimeout(tooltipHideRef.current);
      tooltipHideRef.current = null;
    }
    const bounds = flowWrapper.current?.getBoundingClientRect();
    if (bounds) setTooltipPos({ x: event.clientX - bounds.left + 8, y: event.clientY - bounds.top + 8 });
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    if (tooltipHideRef.current) clearTimeout(tooltipHideRef.current);
    tooltipHideRef.current = setTimeout(() => {
      setShowTooltip(false);
      setHoverFiles([]);
    }, 180);
  }, []);

  const handleOpenLinkedFile = useCallback(async (fileMeta) => {
    if (!fileMeta?.fileId) return;

    setViewerOpen(true);
    setViewerLoading(true);
    setActiveFile({
      _id: fileMeta.fileId,
      fileName: fileMeta.fileName,
      fileType: fileMeta.fileType,
      content: fileMeta.fileContent || '',
    });

    try {
      const openedFile = await loadViewerFile(fileMeta.fileId, {
        ...fileMeta,
        _id: fileMeta.fileId,
      });
      console.debug('Opened linked file details', {
        fileId: fileMeta.fileId,
        fileName: fileMeta.fileName,
        contentLength: openedFile.content.length,
      });
      setActiveFile(openedFile);
    } catch (error) {
      console.error('Failed to open linked file', error);
      onToast?.(error.response?.data?.message || 'Failed to open file', 'error');
      setViewerOpen(false);
    } finally {
      setViewerLoading(false);
      setShowTooltip(false);
    }
  }, [loadViewerFile, onToast]);

  const handleSaveLinkedFile = useCallback(async ({ content, changeNote }) => {
    if (!activeFile?._id || !currentUserId) return;

    setViewerSaving(true);

    try {
      await updateFileContent(activeFile._id, {
        fileContent: content,
        uploadedBy: currentUserId,
        changeNote: changeNote || undefined,
      });

      const refreshedFile = await loadViewerFile(activeFile._id, activeFile);
      setActiveFile(refreshedFile);
      onToast?.('File updated', 'success');
    } catch (error) {
      console.error('Failed to save linked file', error);
      onToast?.(error.response?.data?.message || 'Failed to save file', 'error');
      throw error;
    } finally {
      setViewerSaving(false);
    }
  }, [activeFile, loadViewerFile, onToast, currentUserId]);

  /* ── Context menu ── */
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault(); event.stopPropagation();
    const bounds = flowWrapper.current?.getBoundingClientRect();
    setContextMenu({ type: 'node', id: node.id, x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0) });
  }, []);

  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault(); event.stopPropagation();
    const bounds = flowWrapper.current?.getBoundingClientRect();
    setContextMenu({ type: 'edge', id: edge.id, x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0) });
  }, []);

  /* ── Add node from sidebar ── */
  const handleAddNode = useCallback((template) => {
    if (!template) return;
    const id = makeTempId();
    const pos = { x: 200 + Math.floor(Math.random() * 200), y: 160 + Math.floor(Math.random() * 120) };
    const isNote = template.type === 'note';

    const node = {
      id,
      position: pos,
      data: isNote
        ? enrichNoteData({ label: '', width: 180, height: 110 })
        : { label: template.title || 'Node', type: template.type },
      style: { width: template.width || DEFAULT_W, height: template.height || DEFAULT_H },
      type: isNote ? 'note' : 'defaultNode',
    };

    setNodes((nds) => nds.concat(node));

    (async () => {
      try {
        if (isNote) {
          const res = await createNote({ text: '', position: pos, roomId, createdBy: currentUserId });
          const createdId = res.data?.noteId;
          if (createdId) {
            setNodes((cur) => cur.map((n) => n.id === id
              ? { ...n, id: `note:${createdId}`, data: enrichNoteData({ label: '', width: 180, height: 110 }) }
              : n
            ));
          }
        } else {
          const res = await createNode({ title: template.title || 'Node', type: template.type || 'service', position: pos, width: template.width || DEFAULT_W, height: template.height || DEFAULT_H, createdBy: currentUserId, roomId });
          const createdId = res.data?.nodeId;
          if (createdId) setNodes((cur) => cur.map((n) => n.id === id ? { ...n, id: `shape:${createdId}` } : n));
        }
      } catch (e) {
        console.warn('Create node failed', e);
        setNodes((cur) => cur.filter((n) => n.id !== id));
        onToast?.('Failed to add element', 'error');
      }
    })();
  }, [setNodes, roomId, currentUserId, enrichNoteData, onToast]);

  /* ── Delete handlers ── */
  const handleNodesDelete = useCallback(async (removedNodes) => {
    if (!removedNodes?.length) return;
    const ids = removedNodes.map((n) => n.id);
    setNodes((cur) => cur.filter((n) => !ids.includes(n.id)));
    setEdges((cur) => cur.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)));

    for (const id of ids) {
      try {
        if (String(id).startsWith('shape:')) await deleteNode(String(id).split(':')[1]);
        else if (String(id).startsWith('note:')) await deleteNote(String(id).split(':')[1]);
      } catch (e) { console.warn('Delete failed', id, e); }
    }
  }, [setNodes, setEdges]);

  const handleEdgesDelete = useCallback(async (removedEdges) => {
    if (!removedEdges?.length) return;
    const ids = removedEdges.map((e) => e.id);
    setEdges((cur) => cur.filter((e) => !ids.includes(e.id)));
    for (const id of ids) {
      try {
        if (String(id).startsWith('edge:')) await deleteEdge(String(id).split(':')[1]);
      } catch (e) { console.warn('Delete edge failed', id, e); }
    }
  }, [setEdges]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
      const selNodes = nodes.filter((n) => n.selected);
      const selEdges = edges.filter((ed) => ed.selected);
      if (!selNodes.length && !selEdges.length) return;
      e.preventDefault();
      if (selNodes.length) handleNodesDelete(selNodes);
      if (selEdges.length) handleEdgesDelete(selEdges);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, handleNodesDelete, handleEdgesDelete]);

  /* ── Save canvas ── */
  const handleSave = useCallback(async () => {
    if (!roomId) return;
    setSaving(true);
    try {
      const nodeItems = nodes.filter((n) => n.type !== 'note');
      const noteItems = nodes.filter((n) => n.type === 'note');

      const nodesPayload = nodeItems.map((n) => ({
        tempShapeId: n.id,
        title: n.data?.label || '',
        type: n.data?.type || 'service',
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        width: n.style?.width || DEFAULT_W,
        height: n.style?.height || DEFAULT_H,
        createdBy: currentUserId, roomId,
      }));

      const notesPayload = noteItems
        .map((n) => {
          const dbId = String(n.id).startsWith('note:') ? String(n.id).split(':')[1] : null;
          const text = n.data?.label || '';
          return dbId ? { _id: dbId, text, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, createdBy: currentUserId, roomId } : null;
        })
        .filter(Boolean);

      const edgesPayload = edges.map((e) => {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        if (!src || !tgt || src.type === 'note' || tgt.type === 'note') return null;
        return {
          sourceTempId: e.source, targetTempId: e.target,
          sourcePoint: { x: Math.round(src.position.x), y: Math.round(src.position.y) },
          targetPoint: { x: Math.round(tgt.position.x), y: Math.round(tgt.position.y) },
          createdBy: currentUserId,
        };
      }).filter(Boolean);

      await saveCanvas({ roomId, nodes: nodesPayload, edges: edgesPayload, notes: notesPayload });
      setLastSaved(new Date());
      onToast?.('Canvas saved', 'success');
    } catch (err) {
      console.error('Save error', err);
      onToast?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }, [roomId, nodes, edges, currentUserId, onToast]);

  /* ── Connect edge ── */
  const onConnect = useCallback(async (params) => {
    const newEdge = {
      id: `edge:${Date.now()}`, ...params,
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      markerEnd: { type: 'arrowclosed', color: '#94a3b8' },
    };
    setEdges((eds) => addEdge(newEdge, eds));
    try {
      const srcDb = String(params.source).startsWith('shape:') ? params.source.split(':')[1] : params.source;
      const tgtDb = String(params.target).startsWith('shape:') ? params.target.split(':')[1] : params.target;
      const both = srcDb && tgtDb && !String(srcDb).includes('temp') && !String(tgtDb).includes('temp');
      if (both) await createEdge({ sourceNodeId: srcDb, targetNodeId: tgtDb, roomId, createdBy: currentUserId });
      else await handleSave();
    } catch {
      try {
        await handleSave();
      } catch (error) {
        console.warn('Fallback canvas save failed', error);
      }
    }
  }, [setEdges, roomId, currentUserId, handleSave]);

  /* ── Presence badge colors ── */
  const cursorList = Object.values(remoteCursors);

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      <TemplateSidebar onAddNode={handleAddNode} />

      <div style={{ flex: 1, position: 'relative' }} ref={flowWrapper} onMouseMove={handleMouseMove}>

        {/* ── Top bar ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          pointerEvents: 'auto',
        }}>
          {/* Live users */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {cursorList.slice(0, 6).map((c) => {
              const col = colorForUser(c.userId);
              return (
                <div
                  key={c.socketId}
                  title={c.userName}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: col,
                    border: '2px solid #fff',
                    boxShadow: `0 0 0 2px ${col}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                    cursor: 'default',
                  }}
                >
                  {(c.userName || 'U').charAt(0).toUpperCase()}
                </div>
              );
            })}
            {cursorList.length > 0 && (
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 2 }}>
                {cursorList.length} online
              </span>
            )}
          </div>

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastSaved && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                background: saving ? '#e2e8f0' : '#6366f1',
                color: saving ? '#94a3b8' : '#fff',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                boxShadow: saving ? 'none' : '0 2px 8px #6366f144',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* ── React Flow ── */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={handleNodesDelete}
          onEdgesDelete={handleEdgesDelete}
          onConnect={onConnect}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseMove={handleNodeMouseMove}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={null}   // We handle delete ourselves to guard textareas
          style={{ width: '100%', height: '100%', paddingTop: 48 }}
          defaultEdgeOptions={{
            style: { stroke: '#94a3b8', strokeWidth: 1.5 },
            markerEnd: { type: 'arrowclosed', color: '#94a3b8' },
          }}
        >
          <Background color="#e2e8f0" gap={20} size={1} />
          <Controls
            style={{
              bottom: 16, left: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          />
          <MiniMap
            style={{ bottom: 16, right: 16, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            nodeColor={(n) => {
              if (n.type === 'note') return '#fde68a';
              return templateColorToStyle(n.data?.type).border || '#94a3b8';
            }}
            maskColor="rgba(248,250,252,0.7)"
          />
        </ReactFlow>

        {/* ── Remote cursors overlay ── */}
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 300 }}>
          {cursorList.map((c) => {
            const col = colorForUser(c.userId);
            return (
              <div
                key={c.socketId}
                style={{
                  position: 'absolute',
                  left: c.x,
                  top: c.y,
                  pointerEvents: 'none',
                  transform: 'translate(0, 0)',
                  transition: 'left 0.06s linear, top 0.06s linear',
                }}
              >
                <CursorIcon color={col} />
                <div style={{
                  position: 'absolute',
                  top: 18,
                  left: 14,
                  background: col,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 99,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                  userSelect: 'none',
                }}>
                  {c.userName || 'User'}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Context menu ── */}
        {contextMenu && (
          <div
            style={{ position: 'absolute', left: contextMenu.x, top: contextMenu.y, zIndex: 500 }}
            onMouseLeave={closeContextMenu}
          >
            <div style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: 140,
              fontSize: 13,
              overflow: 'hidden',
            }}>
              {contextMenu.type === 'node' && (
                <div
                  style={{ padding: '9px 14px', cursor: 'pointer', color: '#ef4444', fontWeight: 500 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={async () => { closeContextMenu(); const node = nodes.find((n) => n.id === contextMenu.id); if (node) await handleNodesDelete([node]); }}
                >
                  🗑 Delete node
                </div>
              )}
              {contextMenu.type === 'edge' && (
                <div
                  style={{ padding: '9px 14px', cursor: 'pointer', color: '#ef4444', fontWeight: 500 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={async () => { closeContextMenu(); const ed = edges.find((e) => e.id === contextMenu.id); if (ed) await handleEdgesDelete([ed]); }}
                >
                  🗑 Delete edge
                </div>
              )}
              <div
                style={{ padding: '9px 14px', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={closeContextMenu}
              >
                Cancel
              </div>
            </div>
          </div>
        )}

        {/* ── File tooltip ── */}
        {showTooltip && hoverFiles.length > 0 && (
          <div style={{
            position: 'absolute', left: tooltipPos.x, top: tooltipPos.y, zIndex: 450,
            background: '#fff', border: '1px solid #e2e8f0',
            padding: '8px 12px', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            pointerEvents: 'auto',
          }}
            onMouseEnter={() => {
              if (tooltipHideRef.current) {
                clearTimeout(tooltipHideRef.current);
                tooltipHideRef.current = null;
              }
            }}
            onMouseLeave={() => {
              setShowTooltip(false);
              setHoverFiles([]);
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Linked files
            </div>
            {hoverFiles.map((f) => (
              <div
                key={f.fileId}
                onClick={() => handleOpenLinkedFile(f)}
                style={{ fontSize: 13, padding: '4px 0', color: '#334155', cursor: 'pointer' }}
              >
                📎 {f.fileName}
              </div>
            ))}
          </div>
        )}
        <FileEditorModal
          key={`${activeFile?._id || 'file'}-${activeFile?.updatedAt || activeFile?.content?.length || 0}`}
          open={viewerOpen}
          file={activeFile}
          loading={viewerLoading}
          saving={viewerSaving}
          allowEdit
          onClose={() => {
            setViewerOpen(false);
            setActiveFile(null);
          }}
          onSave={handleSaveLinkedFile}
        />
      </div>
    </div>
  );
}
