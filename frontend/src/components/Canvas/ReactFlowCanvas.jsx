import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { getCanvas, saveCanvas, getNodeFiles, getFileLink, createNote, updateNote, createEdge, createNode, updateNode, deleteNode, deleteEdge, deleteNote } from '../../services/api';
import { io } from 'socket.io-client';
import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_W = 160;
const DEFAULT_H = 80;

function templateColorToTldraw(type) {
  const map = {
    frontend: 'blue',
    backend: 'green',
    database: 'orange',
    service: 'violet',
    jwt: 'yellow',
    queue: 'red',
    cache: 'green',
    gateway: 'blue',
  };
  return map[type] || 'grey';
}

const makeTempId = () => `shape:temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

function NoteNode({ id, data }) {
  const [text, setText] = useState(data?.label || "");
  const [editing, setEditing] = useState(false);

  const rf = useReactFlow();

  // Update local state only when not editing
  useEffect(() => {
    if (!editing) {
      setText(data?.label || "");
    }
  }, [data?.label, editing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditing(true);
  };

  const handleChange = (e) => {
    const val = e.target.value;

    setText(val);

    if (data?.onChange) {
      data.onChange(id, val);
    } else {
      rf.setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, label: val } }
            : n
        )
      );
    }
  };

  const handleBlur = () => {
    setEditing(false);

    if (data?.onPersist) {
      data.onPersist(id);
    }
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        padding: 8,
        borderRadius: 6,
        background: "#FFF9C4",
        width: data?.width || 140,
        height: data?.height || 70,
        boxShadow: "var(--shadow-sm)",
        color: "#000"
      }}
    >
      {/* TEXT DISPLAY */}
      {!editing ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            cursor: "grab",
            color: "#000"
          }}
        >
          {text || "Double-click to edit note"}
        </div>
      ) : (
        <textarea
          className="nodrag"
          autoFocus
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            resize: "none",
            outline: "none",
            background: "transparent",
            color: "#000",
            fontSize: 13
          }}
        />
      )}
    </div>
  );
}

function NodeWithHandles({ id, data }) {
  return (
    <div style={{ padding: 8, borderRadius: 6, background: data?.background || '#fff', minWidth: data?.width || DEFAULT_W, minHeight: data?.height || DEFAULT_H, boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <Handle type="target" id="top" position="top" style={{ top: -8, left: '50%', transform: 'translateX(-50%)', background: '#555' }} />
      <Handle type="target" id="left" position="left" style={{ left: -8, top: '50%', transform: 'translateY(-50%)', background: '#555' }} />
      <div style={{ pointerEvents: 'auto', fontSize: 13 }}>{data?.label || 'Node'}</div>
      <Handle type="source" id="right" position="right" style={{ right: -8, top: '50%', transform: 'translateY(-50%)', background: '#555' }} />
      <Handle type="source" id="bottom" position="bottom" style={{ bottom: -8, left: '50%', transform: 'translateX(-50%)', background: '#555' }} />
    </div>
  );
}

export default function ReactFlowCanvas({ roomId, userId, onToast }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setActiveTab } = useRoom();
  const flowWrapper = useRef(null);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const socketRef = useRef(null);
  const lastEmitRef = useRef(0);
  const [remoteCursors, setRemoteCursors] = useState({});

  const [hoverFiles, setHoverFiles] = useState([]);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  // Update note text in React Flow state
  const updateNoteText = useCallback((nodeId, text) => {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: text } } : n)));
  }, [setNodes]);

  // Persist note to backend (create or update)
  const persistNote = useCallback(async (nodeId) => {
    // capture snapshot of node
    const nodeObj = (nodes || []).find((n) => n.id === nodeId);
    if (!nodeObj) return;

    const text = String(nodeObj.data?.label || '').trim();
    if (!text) return;

    try {
      if (String(nodeId).startsWith('note:')) {
        const dbId = String(nodeId).split(':')[1];
        await updateNote(dbId, { text });
      } else {
        const res = await createNote({ text, position: { x: Math.round(nodeObj.position.x), y: Math.round(nodeObj.position.y) }, roomId, createdBy: userId });
        const createdId = res?.data?.noteId;
        if (createdId) {
          setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, id: `note:${createdId}` } : n)));
        }
      }
    } catch (err) {
      console.error('persistNote error', err);
    }
  }, [nodes, setNodes, createNote, updateNote, roomId, userId]);

  useEffect(() => {
    if (!roomId) {
      setNodes([]);
      setEdges([]);
      return;
    }
    

    getCanvas(roomId)
      .then((res) => {
        const data = res.data || {};

        const loadedNodes = [
          ...(data.nodes || []).map((n) => ({
            id: `shape:${n._id}`,
            position: { x: n.position?.x ?? 100, y: n.position?.y ?? 100 },
            data: { label: n.title, type: n.type, background: templateColorToTldraw(n.type) },
            style: { width: n.width || DEFAULT_W, height: n.height || DEFAULT_H },
            type: 'defaultNode',
          })),
          ...(data.notes || []).map((note) => ({
            id: `note:${note._id}`,
            position: { x: note.position?.x ?? 120, y: note.position?.y ?? 120 },
            data: { label: note.text, width: 140, height: 70, onChange: updateNoteText, onPersist: persistNote },
            type: 'note',
          })),
        ];

        const loadedEdges = (data.edges || []).map((e) => ({
          id: `edge:${e._id}`,
          source: `shape:${e.sourceNodeId}`,
          target: `shape:${e.targetNodeId}`,
          type: 'default',
        }));

        setNodes(loadedNodes);
        setEdges(loadedEdges);
      })
      .catch(() => {});
  }, [roomId]);

  // Presence + cursor handling
  useEffect(() => {
    if (!roomId || !userId) {
      setRemoteCursors({});
      return;
    }

    const socket = io('http://localhost:5002', { transports: ['websocket'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('presence-join', { userId, roomId, userName: user?.name });
    });

    socket.on('cursor-update', (cursor) => {
      setRemoteCursors((current) => ({ ...current, [cursor.socketId]: cursor }));
    });

    // Realtime canvas CRUD events
    socket.on('node-created', (node) => {
      const n = { id: `shape:${node._id}`, position: { x: node.position.x, y: node.position.y }, data: { label: node.title, type: node.type }, style: { width: node.width || DEFAULT_W, height: node.height || DEFAULT_H, background: templateColorToTldraw(node.type) } };
      setNodes((cur) => [...cur.filter((x) => x.id !== n.id), n]);
    });

    socket.on('node-updated', (node) => {
      setNodes((cur) => cur.map((x) => (x.id === `shape:${node._id}` ? { ...x, position: { x: node.position.x, y: node.position.y }, data: { label: node.title, type: node.type } } : x)));
    });

    socket.on('node-deleted', ({ nodeId }) => {
      setNodes((cur) => cur.filter((x) => x.id !== `shape:${nodeId}`));
    });

    socket.on('edge-created', (edge) => {
      const e = { id: `edge:${edge._id}`, source: `shape:${edge.sourceNodeId}`, target: `shape:${edge.targetNodeId}`, type: 'default' };
      setEdges((cur) => [...cur.filter((x) => x.id !== e.id), e]);
    });

    socket.on('edge-deleted', ({ edgeId }) => {
      setEdges((cur) => cur.filter((x) => x.id !== `edge:${edgeId}`));
    });

    socket.on('note-created', (note) => {
      const n = { id: `note:${note._id}`, position: { x: note.position.x, y: note.position.y }, data: { label: note.text, width: 140, height: 70, onChange: updateNoteText, onPersist: persistNote }, type: 'note' };
      setNodes((cur) => [...cur, n]);
    });

    socket.on('note-updated', (note) => {
      setNodes((cur) => cur.map((x) => (x.id === `note:${note._id}` ? { ...x, data: { ...x.data, label: note.text } } : x)));
    });

    socket.on('cursor-remove', ({ socketId }) => {
      setRemoteCursors((current) => {
        const next = { ...current };
        delete next[socketId];
        return next;
      });
    });

    socket.on('disconnect', () => {
      setRemoteCursors({});
    });

    return () => {
      try { socket.disconnect(); } catch (e) {}
      socketRef.current = null;
      setRemoteCursors({});
    };
  }, [roomId, userId]);

  const handleMouseMove = useCallback((event) => {
    const socket = socketRef.current;
    const bounds = flowWrapper.current?.getBoundingClientRect();

    if (!socket || !bounds || !roomId || !userId) return;

    const now = Date.now();
    if (now - lastEmitRef.current < 16) return;
    lastEmitRef.current = now;

    socket.emit('cursor-move', {
      userId,
      roomId,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      userName: user?.name || 'User',
    });
  }, [roomId, userId, user?.name]);

  const onNodeDragStop = useCallback(async (event, node) => {
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
  }, [updateNode, updateNote]);

  const fetchNodeFiles = useCallback(async (nodeDbId, clientX, clientY) => {
    if (!nodeDbId) return;
    try {
      const res = await getNodeFiles(nodeDbId);
      const links = Array.isArray(res.data) ? res.data : res.data || [];
      const files = await Promise.all(
        links.map(async (link) => {
          try {
            const f = await getFileLink(link.fileId);
            return { ...f.data, linkId: link._id };
          } catch (e) {
            return null;
          }
        })
      );

      const filtered = files.filter(Boolean);
      setHoverFiles(filtered);
      const bounds = flowWrapper.current?.getBoundingClientRect();
      if (bounds) {
        setTooltipPos({ x: clientX - bounds.left + 8, y: clientY - bounds.top + 8 });
      }
      setShowTooltip(true);
    } catch (err) {
      setHoverFiles([]);
      setShowTooltip(false);
    }
  }, []);

  const handleNodeMouseEnter = useCallback((event, node) => {
    const id = node?.id || '';
    if (!id.startsWith('shape:')) return;
    const dbId = id.split(':')[1];
    if (!dbId || dbId.startsWith('temp_')) return;

    fetchNodeFiles(dbId, event.clientX, event.clientY);
  }, [fetchNodeFiles]);

  const handleNodeMouseMove = useCallback((event) => {
    const bounds = flowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;
    setTooltipPos({ x: event.clientX - bounds.left + 8, y: event.clientY - bounds.top + 8 });
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setShowTooltip(false);
    setHoverFiles([]);
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = flowWrapper.current?.getBoundingClientRect();
    setContextMenu({ type: 'node', id: node.id, x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0) });
  }, []);

  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = flowWrapper.current?.getBoundingClientRect();
    setContextMenu({ type: 'edge', id: edge.id, x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0) });
  }, []);

  const handleAddNode = useCallback((template) => {
    if (!template) return;
    const id = makeTempId();
    const pos = { x: 200 + Math.floor(Math.random() * 200), y: 200 + Math.floor(Math.random() * 120) };

    const node = {
      id,
      position: pos,
      data: { label: template.title || 'Node', type: template.type, onChange: template.type === 'note' ? updateNoteText : undefined, onPersist: template.type === 'note' ? persistNote : undefined },
      style: { width: template.width || DEFAULT_W, height: template.height || DEFAULT_H, background: template.bgColor || templateColorToTldraw(template.type) },
      type: template.type === 'note' ? 'note' : 'defaultNode',
    };

    setNodes((nds) => nds.concat(node));

    // Persist on server: use note endpoints for notes, node endpoints for others
    (async () => {
      try {
        if (template.type === 'note') {
              const initialText = template.title || 'New note';
              const res = await createNote({ text: initialText, position: { x: pos.x, y: pos.y }, roomId, createdBy: userId });
              const createdId = res.data?.noteId;
              if (createdId) {
                setNodes((cur) => cur.map((n) => (n.id === id ? { ...n, id: `note:${createdId}`, data: { ...n.data, label: initialText } } : n)));
              }
            } else {
          const res = await createNode({ title: template.title || 'Node', type: template.type || 'service', position: { x: pos.x, y: pos.y }, width: template.width || DEFAULT_W, height: template.height || DEFAULT_H, createdBy: userId, roomId });
          const createdId = res.data?.nodeId;
          if (createdId) {
            setNodes((cur) => cur.map((n) => (n.id === id ? { ...n, id: `shape:${createdId}` } : n)));
          }
        }
      } catch (e) {
        console.warn('Create node failed', e);
        // Remove the temporary node if create fails
        setNodes((cur) => cur.filter((n) => n.id !== id));
        onToast?.('Create node failed', 'error');
      }
    })();
  }, [setNodes, createNode, createNote, roomId, userId]);

  // Deletion helpers
  const handleNodesDelete = useCallback(async (removedNodes) => {
    if (!Array.isArray(removedNodes) || removedNodes.length === 0) return;
    const ids = removedNodes.map((n) => n.id);

    // Remove locally
    setNodes((cur) => cur.filter((n) => !ids.includes(n.id)));

    // Remove any connected edges locally
    const connected = edges.filter((e) => ids.includes(e.source) || ids.includes(e.target));
    setEdges((cur) => cur.filter((e) => !connected.find((c) => c.id === e.id)));

    // Persist deletes for persisted nodes / edges
    for (const id of ids) {
      try {
        if (String(id).startsWith('shape:')) {
          const dbId = String(id).split(':')[1];
          await deleteNode(dbId);
        } else if (String(id).startsWith('note:')) {
          const dbId = String(id).split(':')[1];
          await deleteNote(dbId);
        }
      } catch (e) {
        console.warn('Failed to delete node on server', id, e);
      }
    }

    for (const e of connected) {
      try {
        if (String(e.id).startsWith('edge:')) {
          const dbEdgeId = String(e.id).split(':')[1];
          await deleteEdge(dbEdgeId);
        }
      } catch (err) {
        console.warn('Failed to delete connected edge', err);
      }
    }
  }, [edges, setNodes, setEdges]);

  const handleEdgesDelete = useCallback(async (removedEdges) => {
    if (!Array.isArray(removedEdges) || removedEdges.length === 0) return;
    const ids = removedEdges.map((e) => e.id);
    setEdges((cur) => cur.filter((e) => !ids.includes(e.id)));

    for (const id of ids) {
      try {
        if (String(id).startsWith('edge:')) {
          const dbId = String(id).split(':')[1];
          await deleteEdge(dbId);
        }
      } catch (e) {
        console.warn('Failed to delete edge on server', id, e);
      }
    }
  }, [setEdges]);

  // Global delete key handling
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const selNodes = nodes.filter((n) => n.selected);
      const selEdges = edges.filter((ed) => ed.selected);
      if (selNodes.length === 0 && selEdges.length === 0) return;
      e.preventDefault();
      if (selNodes.length) handleNodesDelete(selNodes);
      if (selEdges.length) handleEdgesDelete(selEdges);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, handleNodesDelete, handleEdgesDelete]);

  const handleSave = useCallback(async () => {
    if (!roomId) return;
    setSaving(true);

    try {
      // Separate normal nodes from note nodes
      const nodeItems = nodes.filter((n) => n.type !== 'note');
      const noteItems = nodes.filter((n) => n.type === 'note');

      const nodesPayload = nodeItems.map((n) => ({
        tempShapeId: n.id,
        title: n.data?.label || '',
        type: n.data?.type || 'service',
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        width: n.style?.width || DEFAULT_W,
        height: n.style?.height || DEFAULT_H,
        createdBy: userId,
        roomId,
      }));

      const notesPayload = noteItems
        .map((n) => {
          const dbId = String(n.id).startsWith('note:') ? String(n.id).split(':')[1] : null;
          const text = n.data?.label || '';
          const item = {
            text,
            position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
            createdBy: userId,
            roomId,
          };
          if (dbId) item._id = dbId;
          return item;
        })
        .filter((it) => String(it.text || '').trim().length > 0);

      // Only include edges that connect non-note nodes (notes are persisted separately)
      const edgesPayload = edges.map((e) => {
        const sourceNode = nodes.find((n) => n.id === e.source);
        const targetNode = nodes.find((n) => n.id === e.target);

        if (!sourceNode || !targetNode) return null;
        if (sourceNode.type === 'note' || targetNode.type === 'note') return null;

        return {
          sourceTempId: e.source || null,
          targetTempId: e.target || null,
          sourcePoint: sourceNode ? { x: Math.round(sourceNode.position.x), y: Math.round(sourceNode.position.y) } : null,
          targetPoint: targetNode ? { x: Math.round(targetNode.position.x), y: Math.round(targetNode.position.y) } : null,
          createdBy: userId,
        };
      }).filter(Boolean);

      // Debug: log payload
      try { console.debug('ReactFlow save payload', { roomId, nodesPayload, edgesPayload, notesPayload }); } catch (e) {}

      await saveCanvas({ roomId, nodes: nodesPayload, edges: edgesPayload, notes: notesPayload });
      setLastSaved(new Date());
      onToast?.('Canvas saved', 'success');
    } catch (err) {
      console.error('Save error', err);
      onToast?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }, [roomId, nodes, edges, userId, onToast]);

  const onConnect = useCallback(async (params) => {
    const newEdge = { id: `edge:${Date.now()}`, ...params };
    setEdges((eds) => addEdge(newEdge, eds));

    // Try to persist the edge. If nodes are not yet persisted as DB ids, fall back to saving full canvas.
    try {
      const sourceRaw = params.source;
      const targetRaw = params.target;
      const sourceDb = String(sourceRaw).startsWith('shape:') ? sourceRaw.split(':')[1] : sourceRaw;
      const targetDb = String(targetRaw).startsWith('shape:') ? targetRaw.split(':')[1] : targetRaw;

      const bothDb = sourceDb && targetDb && !String(sourceDb).includes('temp') && !String(targetDb).includes('temp');

      if (bothDb) {
        await createEdge({ sourceNodeId: sourceDb, targetNodeId: targetDb, roomId, createdBy: userId });
      } else {
        // fallback: save full canvas which will map temp ids
        await handleSave();
      }
    } catch (e) {
      console.warn('Persist edge failed, will rely on full save', e);
      try { await handleSave(); } catch (_) {}
    }
  }, [setEdges, createEdge, roomId, userId, handleSave]);

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%' }}>
      <TemplateSidebar onAddNode={handleAddNode} />
      <div style={{ flex: 1, position: 'relative' }} ref={flowWrapper} onMouseMove={handleMouseMove}>
        <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 400 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 10 }}>{lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Unsaved changes'}</span>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save canvas'}
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={handleNodesDelete}
          onEdgesDelete={handleEdgesDelete}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={(event, node) => {
              event.stopPropagation();
            }}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseMove={handleNodeMouseMove}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          nodeTypes={{ note: NoteNode, defaultNode: NodeWithHandles }}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
        {contextMenu && (
          <div style={{ position: 'absolute', left: contextMenu.x, top: contextMenu.y, zIndex: 500 }}>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 6, boxShadow: 'var(--shadow-md)', minWidth: contextMenu.type === 'node' ? 110 : 140, fontSize: 13 }}>
              {contextMenu.type === 'node' && (
                <div>
                  <div style={{ padding: 6, cursor: 'pointer', fontSize: 13 }} onClick={async () => { closeContextMenu(); const node = nodes.find((n) => n.id === contextMenu.id); if (node) await handleNodesDelete([node]); }}>
                    Delete node
                  </div>
                </div>
              )}
              {contextMenu.type === 'edge' && (
                <div>
                  <div style={{ padding: 6, cursor: 'pointer', fontSize: 13 }} onClick={async () => { closeContextMenu(); const ed = edges.find((e) => e.id === contextMenu.id); if (ed) await handleEdgesDelete([ed]); }}>
                    Delete edge
                  </div>
                </div>
              )}
              <div style={{ padding: 6, cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12 }} onClick={closeContextMenu}>Cancel</div>
            </div>
          </div>
        )}
        {/* Cursor overlay */}
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          {Object.values(remoteCursors).map((c) => (
            <div key={c.socketId} style={{ position: 'absolute', left: c.x, top: c.y, transform: 'translate(-50%, -100%)', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#000', transform: 'rotate(45deg)' }} />
                <div style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12 }}>{c.userName || 'User'}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Tooltip showing linked files */}
        {showTooltip && hoverFiles.length > 0 && (
          <div style={{ position: 'absolute', left: tooltipPos.x, top: tooltipPos.y, zIndex: 450, background: 'var(--bg-primary)', border: '0.5px solid var(--border-tertiary)', padding: 8, borderRadius: 8, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Linked files</div>
            {hoverFiles.map((f) => (
              <div key={f.fileId || f.fileId} style={{ fontSize: 13, padding: '6px 8px', cursor: 'pointer' }} onClick={() => { setActiveTab('files'); }}>
                {f.fileName}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
