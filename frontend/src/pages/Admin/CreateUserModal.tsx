import { useState, useEffect, useCallback } from 'react';
import styles from './CreateUserModal.module.css';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'Student' | 'Teacher' | 'Admin';

interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ROLES: Role[] = ['Student', 'Teacher', 'Admin'];

const EMPTY: CreateUserPayload = { name: '', email: '', password: '', role: 'Student' };

export default function CreateUserModal({ onClose }: Props) {
  const [form, setForm] = useState<CreateUserPayload>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [handleEsc]);

  function setField<K extends keyof CreateUserPayload>(key: K, value: CreateUserPayload[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())  { setError('Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch('/api/auth/admin/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccess(`${form.role} account created for ${form.email}.`);
      setForm(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cu-title">

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>Admin</p>
            <h2 className={styles.modalTitle} id="cu-title">Create User</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <IconX />
          </button>
        </div>

        {/* ── Body ── */}
        <form id="create-user-form" className={styles.modalBody} onSubmit={handleSubmit} noValidate>
          {error   && <p className={styles.errorBanner}>{error}</p>}
          {success && <p className={styles.successBanner}>{success}</p>}

          {/* Role */}
          <div className={styles.field}>
            <span className={styles.label}>Role</span>
            <div className={styles.roleGroup}>
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.roleBtn} ${form.role === r ? styles.roleBtnActive : ''}`}
                  onClick={() => setField('role', r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cu-name">Full Name</label>
            <input
              id="cu-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Jane Doe"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cu-email">Email</label>
            <input
              id="cu-email"
              type="email"
              className={styles.input}
              placeholder="e.g. jane@example.com"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cu-password">Password</label>
            <input
              id="cu-password"
              type="password"
              className={styles.input}
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={e => setField('password', e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </form>

        {/* ── Footer ── */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Close
          </button>
          <button
            type="submit"
            form="create-user-form"
            className={styles.btnCreate}
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Create User'}
          </button>
        </div>

      </div>
    </div>
  );
}
