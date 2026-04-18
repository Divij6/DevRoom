import { useEffect, useRef, useState } from 'react';
import { deleteFile, getFiles, getFileVersions, uploadFile, getNodes, linkFileToNode } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const FILE_ICONS = {
  ts: 'FILE',
  js: 'FILE',
  jsx: 'FILE',
  tsx: 'FILE',
  sql: 'DB',
  json: 'JSON',
  md: 'MD',
  env: 'ENV',
  yml: 'CFG',
  yaml: 'CFG',
  png: 'IMG',
  jpg: 'IMG',
  svg: 'IMG',
  pdf: 'PDF',
  txt: 'TXT',
  sh: 'SH',
};

function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || 'BIN';
}

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

export default function FilesPanel({ roomId, onToast }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const fileInputRef = useRef(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [nodesForLink, setNodesForLink] = useState([]);
  const [selectedNodeForLink, setSelectedNodeForLink] = useState('none');

  const currentUserId = user?._id || user?.id;

  const loadFiles = async () => {
    if (!roomId) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await getFiles(roomId, search);
      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setFiles([]);
      onToast?.(error.response?.data?.message || 'Failed to load files', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [roomId, search]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file || !roomId || !currentUserId) return;

    try {
      const fileContent = await file.text();
      setCandidate({ fileName: file.name, fileContent });

      // load nodes for linking selection
      try {
        const res = await getNodes(roomId);
        setNodesForLink(Array.isArray(res.data) ? res.data : res.data || []);
      } catch (err) {
        setNodesForLink([]);
      }

      setSelectedNodeForLink('none');
      setShowLinkModal(true);
    } catch (err) {
      onToast?.('Failed to read file', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadConfirm = async () => {
    if (!candidate) return;
    setUploading(true);

    try {
      const res = await uploadFile({
        fileName: candidate.fileName,
        fileContent: candidate.fileContent,
        roomId,
        uploadedBy: currentUserId,
        changeNote: changeNote.trim() || undefined,
      });

      const uploadedFile = res.data?.file || res.data?.file || null;

      if (selectedNodeForLink && selectedNodeForLink !== 'none' && uploadedFile) {
        try {
          await linkFileToNode({ nodeId: selectedNodeForLink, fileId: uploadedFile._id, linkedBy: currentUserId, roomId });
        } catch (err) {
          // ignore linking errors
        }
      }

      onToast?.('File uploaded', 'success');
      setChangeNote('');
      setShowLinkModal(false);
      setCandidate(null);
      await loadFiles();
    } catch (error) {
      onToast?.(error.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCancel = () => {
    setShowLinkModal(false);
    setCandidate(null);
  };

  const handleViewVersions = async (file) => {
    setSelectedFile(file);
    setShowVersions(true);

    try {
      const res = await getFileVersions(file._id);
      setVersions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setVersions([]);
      onToast?.(error.response?.data?.message || 'Failed to load versions', 'error');
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Delete this file?')) {
      return;
    }

    try {
      await deleteFile(fileId);
      onToast?.('File deleted', 'success');
      await loadFiles();
    } catch (error) {
      onToast?.(error.response?.data?.message || 'Delete failed', 'error');
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>Files</h2>
          <p style={styles.sub}>{files.length} file{files.length !== 1 ? 's' : ''} in this room</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 180 }}
          />
          <input
            className="input"
            placeholder="Version note (optional)"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            style={{ width: 180 }}
          />
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload file'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <span className="spinner" />
        </div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">FILES</div>
          <div className="empty-state-title">No files yet</div>
          <div className="empty-state-sub">Upload your first file to share it with the team</div>
        </div>
      ) : (
        <div style={styles.fileGrid}>
          {files.map((file) => (
            <div key={file._id} style={styles.fileCard}>
              <div style={styles.fileIconArea}>{fileIcon(file.fileName)}</div>
              <div style={styles.fileInfo}>
                <div style={styles.fileName}>{file.fileName}</div>
                <div style={styles.fileMeta}>
                  {file.uploadedBy?.name || file.uploadedBy?.email || 'Unknown'} · {timeAgo(file.updatedAt)}
                </div>
              </div>
              <div style={styles.fileActions}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleViewVersions(file)}
                  title="Version history"
                >
                  Versions
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(file._id)}
                  title="Delete file"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showVersions && (
        <div className="overlay" onClick={() => setShowVersions(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Version history</h2>
            <p className="modal-sub">{selectedFile?.fileName}</p>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {versions.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: 20 }}>
                  No versions recorded.
                </p>
              ) : (
                versions.map((version) => (
                  <div key={version._id} style={styles.versionRow}>
                    <div style={styles.versionDot} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {version.changeNote || `Version ${version.versionNumber}`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {version.uploadedBy?.name || version.uploadedBy?.email || 'Unknown'} ·{' '}
                        {timeAgo(version.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowVersions(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="overlay" onClick={handleUploadCancel}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Upload & Link</h2>
            <p className="modal-sub">Select which component this file belongs to (optional)</p>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>File</div>
              <div style={{ padding: 10, border: '0.5px solid var(--border-tertiary)', borderRadius: 6 }}>{candidate?.fileName}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>Link to component</div>
              <select value={selectedNodeForLink} onChange={(e) => setSelectedNodeForLink(e.target.value)} style={{ width: '100%', padding: 8 }}>
                <option value="none">None</option>
                {nodesForLink.map((n) => (
                  <option key={n._id} value={n._id}>{n.title || n._id}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleUploadCancel}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleUploadConfirm} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload & Link'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: { padding: 24, height: '100%', display: 'flex', flexDirection: 'column', gap: 16 },
  topRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  title: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  sub: { fontSize: 13, color: 'var(--text-secondary)' },
  fileGrid: { display: 'flex', flexDirection: 'column', gap: 2 },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '0.5px solid var(--border-tertiary)',
    background: 'var(--bg-primary)',
    transition: 'border-color var(--t-base)',
  },
  fileIconArea: { fontSize: 12, fontWeight: 700, flexShrink: 0, width: 40, textAlign: 'center' },
  fileInfo: { flex: 1, overflow: 'hidden' },
  fileName: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileMeta: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 },
  fileActions: { display: 'flex', gap: 4, flexShrink: 0 },
  versionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 0',
    borderBottom: '0.5px solid var(--border-tertiary)',
  },
  versionDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--brand)',
    marginTop: 4,
    flexShrink: 0,
  },
};
