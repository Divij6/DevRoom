import { useEffect, useState } from 'react';

export default function FileEditorModal({
  open,
  file,
  loading = false,
  saving = false,
  allowEdit = true,
  onClose,
  onSave,
}) {
  const [draftContent, setDraftContent] = useState(() => file?.content || '');
  const [changeNote, setChangeNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftContent(file?.content || '');
    }
  }, [file?.content, isEditing]);

  if (!open) return null;

  const resolvedContent = file?.content || '';

  const handleClose = () => {
    setIsEditing(false);
    setChangeNote('');
    onClose?.();
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setIsEditing(false);
      setChangeNote('');
      setDraftContent(resolvedContent);
      return;
    }

    setDraftContent(resolvedContent);
    setIsEditing(true);
  };

  const handleSave = async () => {
    await onSave?.({
      content: draftContent,
      changeNote: changeNote.trim(),
    });
    setIsEditing(false);
    setChangeNote('');
  };

  return (
    <div className="overlay" onClick={handleClose}>
      <div
        className="modal"
        style={{ maxWidth: 920, width: 'min(920px, calc(100vw - 32px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div>
            <h2 className="modal-title" style={{ marginBottom: 4 }}>
              {file?.fileName || 'File'}
            </h2>
            <p className="modal-sub">
              {file?.fileType || 'text'} {file?.updatedAt ? `· updated ${new Date(file.updatedAt).toLocaleString()}` : ''}
            </p>
          </div>
          <div style={styles.headerActions}>
            {allowEdit && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleEditToggle}
                disabled={loading || saving}
              >
                {isEditing ? 'Cancel edit' : 'Edit'}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="spinner" />
          </div>
        ) : (
          <>
            {isEditing && (
              <div style={styles.toolbar}>
                <input
                  className="input"
                  placeholder="What changed? (optional)"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save new version'}
                </button>
              </div>
            )}

            <textarea
              className="input"
              value={isEditing ? draftContent : resolvedContent}
              onChange={(e) => setDraftContent(e.target.value)}
              readOnly={!isEditing}
              spellCheck={false}
              style={{
                ...styles.editor,
                opacity: loading ? 0.7 : 1,
                background: isEditing ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  headerActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  toolbar: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  editor: {
    width: '100%',
    minHeight: 420,
    resize: 'vertical',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: 13,
    lineHeight: 1.6,
    whiteSpace: 'pre',
  },
};
