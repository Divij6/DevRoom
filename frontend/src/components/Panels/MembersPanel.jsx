import { useEffect, useMemo, useState } from 'react';
import { getMembers, inviteMember, removeMember, updateMemberRole } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AV_COLORS = ['av-purple', 'av-teal', 'av-coral', 'av-amber', 'av-blue'];
const ROLES = ['owner', 'editor', 'viewer'];

const avatarClass = (name = '') => {
  const safeName = name || 'U';
  return AV_COLORS[safeName.charCodeAt(0) % AV_COLORS.length];
};

const initials = (name = '') => {
  if (!name) {
    return 'U';
  }

  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function MembersPanel({ roomId, onToast }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  const currentUserId = user?._id || user?.id;

  const myMembership = useMemo(
    () => members.find((member) => {
      const memberUserId = member.userId?._id || member.userId;
      return memberUserId === currentUserId;
    }),
    [members, currentUserId]
  );

  const myRole = myMembership?.role;
  const canInvite = myRole === 'owner' || myRole === 'editor';
  const isOwner = myRole === 'owner';

  const loadMembers = async () => {
    if (!roomId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await getMembers(roomId);
      setMembers(Array.isArray(res.data?.members) ? res.data.members : []);
    } catch (error) {
      setMembers([]);
      onToast?.(error.response?.data?.message || 'Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [roomId]);

  const handleInvite = async (e) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      return;
    }

    setInviting(true);

    try {
      await inviteMember(roomId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      onToast?.('Member invited', 'success');
      setInviteEmail('');
      await loadMembers();
    } catch (err) {
      onToast?.(err.response?.data?.message || 'Invite failed', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      await updateMemberRole(roomId, memberId, { role });
      onToast?.('Role updated', 'success');
      await loadMembers();
    } catch (err) {
      onToast?.(err.response?.data?.message || 'Failed to update role', 'error');
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Remove this member?')) {
      return;
    }

    try {
      await removeMember(roomId, memberId);
      onToast?.('Member removed', 'success');
      await loadMembers();
    } catch (err) {
      onToast?.(err.response?.data?.message || 'Failed to remove member', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>Room members</h2>
        <p style={styles.sub}>All members share access to files, canvas, and history.</p>
      </div>

      <div style={styles.memberList}>
        {members.length === 0 && (
          <p style={styles.empty}>No members found for this room.</p>
        )}

        {members.map((member) => {
          const name = member.userId?.name || 'Unknown';
          const email = member.userId?.email || '';
          const memberUserId = member.userId?._id || member.userId;
          const memberId = member._id;
          const isSelf = memberUserId === currentUserId;

          return (
            <div key={memberId} style={styles.memberRow}>
              <div className={`avatar ${avatarClass(name)}`} style={{ width: 34, height: 34, fontSize: 12 }}>
                {initials(name)}
              </div>
              <div style={styles.memberInfo}>
                <div style={styles.memberName}>
                  {name} {isSelf && <span style={styles.selfTag}>(you)</span>}
                </div>
                <div style={styles.memberEmail}>{email}</div>
              </div>
              <div style={styles.memberActions}>
                {isOwner && !isSelf ? (
                  <>
                    <select
                      style={styles.roleSelect}
                      value={member.role}
                      onChange={(e) => handleRoleChange(memberId, e.target.value)}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(memberId)}>
                      Remove
                    </button>
                  </>
                ) : (
                  <span className={`badge ${member.role === 'owner' ? 'badge-purple' : 'badge-gray'}`}>
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canInvite && (
        <div style={styles.inviteBox}>
          <h3 style={styles.inviteTitle}>Add collaborator</h3>
          <p style={styles.inviteSub}>
            They&apos;ll get access to all room files, canvas, and history from day one.
          </p>
          <form onSubmit={handleInvite} style={styles.inviteForm}>
            <input
              className="input"
              type="email"
              placeholder="colleague@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            <select
              style={styles.roleSelect}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm" disabled={inviting}>
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </form>
        </div>
      )}

      <div style={styles.infoBox}>
        <div style={styles.infoTitle}>Access guarantee</div>
        <div style={styles.infoText}>
          Any new member added to this room instantly gets access to all files, canvas, and version history.
        </div>
      </div>
    </div>
  );
}

const styles = {
  panel: { padding: 24, maxWidth: 620, margin: '0 auto' },
  header: { marginBottom: 20 },
  title: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  sub: { fontSize: 13, color: 'var(--text-secondary)' },
  empty: { fontSize: 12, color: 'var(--text-tertiary)', padding: '12px 0' },
  memberList: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '0.5px solid var(--border-tertiary)',
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 13, fontWeight: 500 },
  memberEmail: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 },
  selfTag: { fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 },
  memberActions: { display: 'flex', alignItems: 'center', gap: 8 },
  roleSelect: {
    fontSize: 12,
    padding: '4px 8px',
    border: '0.5px solid var(--border-primary)',
    borderRadius: 6,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
  },
  inviteBox: {
    border: '0.5px dashed var(--border-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: 16,
    marginBottom: 16,
  },
  inviteTitle: { fontSize: 13, fontWeight: 500, marginBottom: 4 },
  inviteSub: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 },
  inviteForm: { display: 'flex', gap: 8, alignItems: 'center' },
  infoBox: {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: 14,
  },
  infoTitle: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
  infoText: { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 },
};
