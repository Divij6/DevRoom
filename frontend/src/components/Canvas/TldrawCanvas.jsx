import { useRef, useEffect, useCallback, useState } from 'react';
import { Tldraw, createShapeId } from 'tldraw';
import { io } from 'socket.io-client';
import 'tldraw/tldraw.css';
import { getCanvas, saveCanvas } from '../../services/api';
import TemplateSidebar from '../Sidebar/TemplateSidebar';
import { useAuth } from '../../context/AuthContext';

const SOCKET_URL = 'http://localhost:5002';

export default function TldrawCanvas({ roomId, userId, onToast }) {
  const editorRef = useRef(null);
  const canvasAreaRef = useRef(null);
  const socketRef = useRef(null);
  const lastEmitRef = useRef(0);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});

  // Helpers to convert between plain text and tldraw's richText format
  const toRichText = (text = '') => {
    return {
      type: 'doc',
      content: String(text || '')
        .split('\n')
        .map((line) => {
          if (!line) return { type: 'paragraph' };
          return { type: 'paragraph', content: [{ type: 'text', text: line }] };
        }),
    };
  };

  const richTextToString = (richText) => {
    try {
      if (!richText || richText.type !== 'doc') return '';
      return (richText.content || [])
        .map((p) => {
          if (p.type !== 'paragraph') return '';
          return (p.content || []).map((n) => (n.type === 'text' ? n.text : '')).join('');
        })
        .join('\n');
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (!roomId) return;

    getCanvas(roomId)
      .then((res) => {
        const data = res.data;
        const editor = editorRef.current;
        if (!editor || !data) return;

        const shapes = [];
        const nodeIdToShapeId = {};

        (data.nodes || []).forEach((node) => {
          const shapeId = createShapeId(node._id);
          nodeIdToShapeId[String(node._id)] = shapeId;

          shapes.push({
            id: shapeId,
            type: 'geo',
            x: node.position?.x ?? 100,
            y: node.position?.y ?? 100,
            props: {
              geo: 'rectangle',
              w: node.width || 160,
              h: node.height || 80,
              richText: toRichText(node.title),
              fill: 'solid',
              color: templateColorToTldraw(node.type),
            },
            meta: { nodeId: node._id, type: node.type },
          });
        });

        (data.notes || []).forEach((note) => {
          shapes.push({
            id: createShapeId(note._id),
            type: 'geo',
            x: note.position?.x ?? 200,
            y: note.position?.y ?? 200,
            props: {
              geo: 'rectangle',
              w: 140,
              h: 70,
              richText: toRichText(note.text),
              fill: 'solid',
              color: 'yellow',
            },
            meta: { noteId: note._id },
          });
        });

        // Create arrow shapes for edges (if present)
        (data.edges || []).forEach((edge) => {
          const sourceShapeId = nodeIdToShapeId[String(edge.sourceNodeId)];
          const targetShapeId = nodeIdToShapeId[String(edge.targetNodeId)];

          if (sourceShapeId && targetShapeId) {
            shapes.push({
              id: createShapeId(edge._id),
              type: 'arrow',
              props: {
                start: { boundShapeId: sourceShapeId },
                end: { boundShapeId: targetShapeId },
              },
              meta: { edgeId: edge._id },
            });
          }
        });

        if (shapes.length > 0) {
          editor.createShapes(shapes);
          editor.zoomToFit();
        }
      })
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !userId) {
      setRemoteCursors({});
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('cursor-update', (cursor) => {
      setRemoteCursors((current) => ({
        ...current,
        [cursor.socketId]: cursor,
      }));
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
      socket.disconnect();
      socketRef.current = null;
      setRemoteCursors({});
    };
  }, [roomId, userId]);

  const handleMount = useCallback((editor) => {
    editorRef.current = editor;

    // Expose editor for local development/debugging only
    try {
      if (typeof window !== 'undefined' && window.location && window.location.hostname.includes('localhost')) {
        window.__DEVROOM_TL_EDITOR = editor;
        window.__DEVROOM_CREATE_SHAPE_ID = createShapeId;
      }
    } catch (e) {
      // ignore in non-browser environments
    }
  }, []);

const handleAddNode = useCallback((template) => {
  const editor = editorRef.current;
  if (!editor || !template) return;

  const viewport = editor.getViewportPageBounds();

  const x = viewport.x + viewport.w / 2 - (template.width || 160) / 2;
  const y = viewport.y + viewport.h / 2 - (template.height || 80) / 2;

  editor.createShapes([
    {
      id: createShapeId(),
      type: 'geo',
      x,
      y,
      props: {
        geo: 'rectangle',
        w: template.width || 160,
        h: template.height || 80,
        fill: 'solid',
        // use tldraw color keywords (not hex) to satisfy validation
        color: templateColorToTldraw(template.type),
        richText: toRichText(template.title || 'Node'),
      },
      meta: {
        templateType: template.type,
      },
    },
  ]);

}, []);

  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !roomId) return;

    setSaving(true);
    try {
      const shapes = editor.getCurrentPageShapes();
      const nodes = [];
      const notes = [];

      // Build a lookup of shapes by id for edge point resolution
      const shapeLookup = {};
      shapes.forEach((s) => {
        shapeLookup[s.id] = s;
      });

      shapes.forEach((shape) => {
        const isNote = shape.props?.color === 'yellow';
        const pos = { x: Math.round(shape.x), y: Math.round(shape.y) };

        if (isNote) {
          const noteObj = { text: richTextToString(shape.props?.richText) || '', position: pos, createdBy: userId, roomId };
          if (shape.meta?.noteId) noteObj._id = shape.meta.noteId;
          notes.push(noteObj);
        } else if (shape.type !== 'arrow') {
          nodes.push({
            tempShapeId: shape.id,
            title: richTextToString(shape.props?.richText) || 'Node',
            type: shape.meta?.templateType || 'service',
            position: pos,
            width: shape.props?.w || shape.props?.width || 160,
            height: shape.props?.h || shape.props?.height || 80,
            createdBy: userId,
            roomId,
          });
        }
      });

      // Build edges using resolved points (server maps to nearest node by coordinates)
      // Accept shapes that are explicit 'arrow' or have start/end props (defensive)
      const edges = shapes
        .filter((s) => s.type === 'arrow' || s.props?.start || s.props?.end)
        .map((s) => {
          const startBound = s.props?.start?.boundShapeId;
          const endBound = s.props?.end?.boundShapeId;

          let sourcePoint = null;
          let targetPoint = null;

          if (startBound && shapeLookup[startBound]) {
            sourcePoint = { x: Math.round(shapeLookup[startBound].x), y: Math.round(shapeLookup[startBound].y) };
          } else if (s.props?.start?.point) {
            sourcePoint = { x: Math.round(s.props.start.point.x), y: Math.round(s.props.start.point.y) };
          }

          if (endBound && shapeLookup[endBound]) {
            targetPoint = { x: Math.round(shapeLookup[endBound].x), y: Math.round(shapeLookup[endBound].y) };
          } else if (s.props?.end?.point) {
            targetPoint = { x: Math.round(s.props.end.point.x), y: Math.round(s.props.end.point.y) };
          }

          return sourcePoint && targetPoint
            ? {
                sourcePoint,
                targetPoint,
                createdBy: userId,
                sourceTempId: startBound || null,
                targetTempId: endBound || null,
              }
            : null;
        })
        .filter(Boolean);

      // Debugging: log payload so we can inspect edge shapes in the browser console
      try {
        // eslint-disable-next-line no-console
        console.debug('Canvas save payload', { roomId, nodes, edges, notes });
      } catch (e) {}

      // Filter out empty notes to avoid saving blank CanvasNote documents
      const filteredNotes = notes.filter((n) => String(n.text || '').trim().length > 0);

      await saveCanvas({ roomId, nodes, edges, notes: filteredNotes });
      setLastSaved(new Date());
      onToast?.('Canvas saved', 'success');
    } catch (err) {
      console.error('Save error', err);
      onToast?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }, [roomId, userId, onToast]);

  const handleMouseMove = useCallback(
    (event) => {
      const socket = socketRef.current;
      const bounds = canvasAreaRef.current?.getBoundingClientRect();

      if (!socket || !bounds || !roomId || !userId) {
        return;
      }

      const now = Date.now();
      if (now - lastEmitRef.current < 16) {
        return;
      }

      lastEmitRef.current = now;

      socket.emit('cursor-move', {
        userId,
        roomId,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        userName: user?.name || 'User',
      });
    },
    [roomId, userId, user?.name]
  );

  return (
    <div style={styles.wrapper}>
      <TemplateSidebar onAddNode={handleAddNode} />
      <div ref={canvasAreaRef} style={styles.canvasArea} onMouseMove={handleMouseMove}>
        <div style={styles.saveBar}>
          <span style={styles.savedLabel}>
            {lastSaved
              ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Unsaved changes'}
          </span>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 12, height: 12, borderTopColor: '#fff' }} /> : null}
            {saving ? 'Saving...' : 'Save canvas'}
          </button>
        </div>

        

        <div style={styles.cursorLayer}>
          {Object.values(remoteCursors).map((cursor) => (
            <div
              key={cursor.socketId}
              style={{
                ...styles.cursorItem,
                left: cursor.x,
                top: cursor.y,
              }}
            >
              <div
                style={{
                  ...styles.cursorPointer,
                  borderTopColor: cursorColor(cursor.userId),
                }}
              />
              <div
                style={{
                  ...styles.cursorLabel,
                  background: cursorColor(cursor.userId),
                }}
              >
                {cursor.userName || 'User'}
              </div>
            </div>
          ))}
        </div>

        <Tldraw onMount={handleMount} hideUi={false} />
      </div>
    </div>
  );
}

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

function cursorColor(userId = '') {
  const palette = ['#7c3aed', '#0f766e', '#dc2626', '#2563eb', '#ca8a04', '#db2777'];
  const value = String(userId)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return palette[value % palette.length];
}

const styles = {
  wrapper: { display: 'flex', flex: 1, overflow: 'hidden' },
  canvasArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  saveBar: {
    position: 'absolute',
    top: 12,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    zIndex: 400,
    background: 'var(--bg-primary)',
    border: '0.5px solid var(--border-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '6px 10px',
    boxShadow: 'var(--shadow-sm)',
  },
  savedLabel: { fontSize: 12, color: 'var(--text-tertiary)' },
  cursorLayer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 300,
  },
  cursorItem: {
    position: 'absolute',
    transform: 'translate(0, 0)',
  },
  cursorPointer: {
    width: 0,
    height: 0,
    borderLeft: '7px solid transparent',
    borderRight: '7px solid transparent',
    borderTop: '14px solid #7c3aed',
    transform: 'rotate(-35deg)',
    transformOrigin: 'center',
    marginLeft: -2,
  },
  cursorLabel: {
    marginTop: 2,
    marginLeft: 10,
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  },
  
};
