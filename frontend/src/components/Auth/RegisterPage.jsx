import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage({ onGoLogin }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(form.name, form.email, form.password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>
              <svg viewBox="0 0 12 12" fill="none" width="14" height="14">
                <rect x="1" y="1" width="4" height="4" rx="1" fill="white" opacity="0.9" />
                <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.6" />
                <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.6" />
                <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.3" />
              </svg>
            </div>
            <span style={styles.logoText}>DevRoom</span>
          </div>

          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>OK</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Account created</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              You can now sign in with your credentials.
            </p>
            <button className="btn btn-primary" onClick={onGoLogin}>Sign in</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg viewBox="0 0 12 12" fill="none" width="14" height="14">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" opacity="0.9" />
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.6" />
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.6" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.3" />
            </svg>
          </div>
          <span style={styles.logoText}>DevRoom</span>
        </div>

        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.sub}>Start collaborating with your team</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label className="label">Full name</label>
            <input
              className="input"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div style={styles.field}>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div style={styles.field}>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <span style={styles.link} onClick={onGoLogin}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-secondary)',
    backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(83,74,183,0.06) 0%, transparent 60%)',
  },
  card: {
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-xl)',
    border: '0.5px solid var(--border-secondary)',
    boxShadow: 'var(--shadow-lg)',
    padding: '32px',
    width: '100%',
    maxWidth: 380,
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: '#534AB7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 15, fontWeight: 600 },
  title: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 4 },
  sub: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column' },
  error: {
    fontSize: 12,
    color: '#dc2626',
    background: '#fef2f2',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
  },
  footer: { fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 20 },
  link: { color: 'var(--brand)', cursor: 'pointer', fontWeight: 500 },
};
