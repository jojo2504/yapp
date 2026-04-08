import { useState, useEffect, useCallback } from 'react';
import styles from './ManageUsers.module.css';
import { apiFetch } from '../../services/api';
import CreateUserModal from './CreateUserModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'Student' | 'Teacher' | 'Admin';

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  organisation_id: number;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconKey() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
function IconBan() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}
function IconUnban() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLES: Role[] = ['Student', 'Teacher', 'Admin'];

function avatarLetter(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}

function EditModal({ user, onClose, onSaved }: EditModalProps) {
  const [name,  setName]  = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role,  setRole]  = useState<Role>(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEsc = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [handleEsc]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    setLoading(true); setError('');
    try {
      const updated = await apiFetch<User>(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>Edit</p>
            <h2 className={styles.modalTitle}>Edit User</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><IconX /></button>
        </div>
        <form id="edit-user-form" className={styles.modalBody} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.errorBanner}>{error}</p>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="eu-name">Full Name</label>
            <input id="eu-name" type="text" className={styles.input} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="eu-email">Email</label>
            <input id="eu-email" type="email" className={styles.input} value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Role</span>
            <div className={styles.roleGroup}>
              {ROLES.map(r => (
                <button key={r} type="button"
                  className={`${styles.roleBtn} ${role === r ? styles.roleBtnActive : ''}`}
                  onClick={() => setRole(r)}
                >{r}</button>
              ))}
            </div>
          </div>
        </form>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button type="submit" form="edit-user-form" className={styles.btnSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change password modal ─────────────────────────────────────────────────────

interface PwdModalProps {
  user: User;
  onClose: () => void;
}

function PwdModal({ user, onClose }: PwdModalProps) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const handleEsc = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [handleEsc]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await apiFetch(`/api/admin/users/${user.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>Security</p>
            <h2 className={styles.modalTitle}>Change Password</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><IconX /></button>
        </div>
        {success ? (
          <>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                Password for <span className={styles.confirmName}>{user.name}</span> has been updated successfully.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSave} onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <form id="pwd-form" className={styles.modalBody} onSubmit={handleSubmit} noValidate>
              {error && <p className={styles.errorBanner}>{error}</p>}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pwd-new">New Password</label>
                <input id="pwd-new" type="password" className={styles.input} placeholder="Minimum 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pwd-confirm">Confirm Password</label>
                <input id="pwd-confirm" type="password" className={styles.input} placeholder="Repeat the password"
                  value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
              </div>
            </form>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
              <button type="submit" form="pwd-form" className={styles.btnSave} disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

interface DeleteModalProps {
  user: User;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeleteModal({ user, onClose, onDeleted }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleEsc = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [handleEsc]);

  async function handleDelete() {
    setLoading(true); setError('');
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      onDeleted(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>Danger Zone</p>
            <h2 className={styles.modalTitle}>Delete User</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><IconX /></button>
        </div>
        <div className={styles.modalBody}>
          {error && <p className={styles.errorBanner}>{error}</p>}
          <p className={styles.confirmText}>
            This will permanently delete <span className={styles.confirmName}>{user.name}</span> ({user.email}) and all associated data. This action cannot be undone.
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Modal =
  | { kind: 'create' }
  | { kind: 'edit';     user: User }
  | { kind: 'password'; user: User }
  | { kind: 'delete';   user: User };

export default function ManageUsers() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  const [banLoading, setBanLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await apiFetch<User[]>('/api/admin/users');
      setUsers(data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleBan(user: User) {
    setBanLoading(user.id);
    try {
      const updated = await apiFetch<User>(`/api/admin/users/${user.id}/ban`, { method: 'PATCH' });
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch { /* ignore – user stays as-is */ }
    setBanLoading(null);
  }

  function closeModal() { setModal(null); }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Admin</p>
          <h1 className={styles.headerTitle}>Manage Users</h1>
          <p className={styles.headerSub}>{users.length} user{users.length !== 1 ? 's' : ''} registered on the platform</p>
        </div>
        <button className={styles.btnCreate} onClick={() => setModal({ kind: 'create' })}>
          <IconPlus /> Create User
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><IconSearch /></span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filterWrap}>
          <select className={styles.filterSelect} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* ── List ── */}
      <div className={styles.list}>
        {loading && <p className={styles.empty}>Loading users…</p>}
        {!loading && filtered.length === 0 && (
          <p className={styles.empty}>
            {users.length === 0 ? 'No users found.' : 'No users match your search.'}
          </p>
        )}
        {!loading && filtered.map(u => (
          <div key={u.id} className={`${styles.card} ${!u.is_active ? styles.banned : ''}`}>
            <div className={styles.avatar}>{avatarLetter(u.name)}</div>

            <div className={styles.cardMain}>
              <div className={styles.cardTop}>
                <span className={styles.cardName}>{u.name}</span>
                <span className={`${styles.roleBadge} ${styles[`roleBadge_${u.role}`]}`}>{u.role}</span>
                <span className={`${styles.statusBadge} ${u.is_active ? styles.statusBadge_active : styles.statusBadge_banned}`}>
                  {u.is_active ? 'Active' : 'Banned'}
                </span>
              </div>
              <div className={styles.cardEmail}>{u.email}</div>
            </div>

            <span className={styles.cardDate}>{formatDate(u.created_at)}</span>

            <div className={styles.actions}>
              {/* Edit */}
              <button
                className={`${styles.iconBtn} ${styles.edit}`}
                title="Edit user"
                onClick={() => setModal({ kind: 'edit', user: u })}
              ><IconEdit /></button>

              {/* Change password */}
              <button
                className={`${styles.iconBtn} ${styles.pwd}`}
                title="Change password"
                onClick={() => setModal({ kind: 'password', user: u })}
              ><IconKey /></button>

              {/* Ban / Unban */}
              <button
                className={`${styles.iconBtn} ${u.is_active ? styles.ban : styles.unban}`}
                title={u.is_active ? 'Ban user' : 'Unban user'}
                disabled={banLoading === u.id}
                onClick={() => handleToggleBan(u)}
              >
                {u.is_active ? <IconBan /> : <IconUnban />}
              </button>

              {/* Delete */}
              <button
                className={`${styles.iconBtn} ${styles.del}`}
                title="Delete user"
                onClick={() => setModal({ kind: 'delete', user: u })}
              ><IconTrash /></button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modals ── */}
      {modal?.kind === 'create' && (
        <CreateUserModal onClose={() => { closeModal(); fetchUsers(); }} />
      )}
      {modal?.kind === 'edit' && (
        <EditModal
          user={modal.user}
          onClose={closeModal}
          onSaved={updated => { setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)); closeModal(); }}
        />
      )}
      {modal?.kind === 'password' && (
        <PwdModal user={modal.user} onClose={closeModal} />
      )}
      {modal?.kind === 'delete' && (
        <DeleteModal
          user={modal.user}
          onClose={closeModal}
          onDeleted={id => { setUsers(prev => prev.filter(u => u.id !== id)); closeModal(); }}
        />
      )}

    </div>
  );
}
