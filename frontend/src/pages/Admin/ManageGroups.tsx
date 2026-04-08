import { useState, useEffect } from 'react';
import styles from './ManageGroups.module.css';
import GroupModal from './GroupModal';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  studentEmails: string[];
  courseIds: string[];
}

// ── API mapping ───────────────────────────────────────────────────────────────

interface ApiGroup {
  id: number;
  name: string;
  students: string[];
  course_ids: number[];
}

function fromApi(raw: ApiGroup): Group {
  return {
    id: String(raw.id),
    name: raw.name ?? '',
    studentEmails: raw.students ?? [],
    courseIds: (raw.course_ids ?? []).map(String),
  };
}

function toApi(g: Omit<Group, 'id'>): object {
  return {
    name: g.name,
    students: g.studentEmails,
    course_ids: g.courseIds.map(Number),
  };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
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
function IconUsers() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManageGroups() {
  const [groups, setGroups]   = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Group | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadGroups() {
    setLoading(true);
    apiFetch<ApiGroup[]>('/api/groups')
      .then(data => setGroups(data.map(fromApi)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadGroups(); }, []);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(g: Group) { setEditing(g); setModalOpen(true); }

  async function handleSave(data: Omit<Group, 'id'>) {
    const currentEditing = editing;
    setModalOpen(false);
    setEditing(null);
    setError('');
    try {
      if (currentEditing) {
        const updated = await apiFetch<ApiGroup>(`/api/groups/${currentEditing.id}`, {
          method: 'PUT',
          body: JSON.stringify(toApi(data)),
        });
        setGroups(prev => prev.map(g => g.id === currentEditing.id ? fromApi(updated) : g));
      } else {
        const created = await apiFetch<ApiGroup>('/api/groups', {
          method: 'POST',
          body: JSON.stringify(toApi(data)),
        });
        setGroups(prev => [...prev, fromApi(created)]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group.');
      loadGroups();
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    try {
      await apiFetch(`/api/groups/${id}`, { method: 'DELETE' });
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group.');
    }
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Admin</p>
          <h1 className={styles.headerTitle}>Groups</h1>
        </div>
      </div>
      <div className={styles.list} style={{ padding: '2rem', color: 'var(--text-muted, #888)' }}>Loading…</div>
    </div>
  );

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Admin</p>
          <h1 className={styles.headerTitle}>Groups</h1>
          <p className={styles.headerSub}>{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnCreate} onClick={openCreate}>
          <IconPlus /> Create New Group
        </button>
      </div>

      {error && <p style={{ color: 'var(--error, #f87171)', padding: '0 0 1rem' }}>{error}</p>}

      {/* ── Group list ── */}
      <div className={styles.list}>
        {groups.length === 0 && (
          <div className={styles.empty}>No groups yet. Create your first one.</div>
        )}

        {groups.map(group => (
          <div key={group.id} className={styles.card}>

            {/* Content */}
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{group.name}</h3>

              <div className={styles.cardStats}>
                <span className={styles.statPill}>
                  <IconUsers /> {group.studentEmails.length} student{group.studentEmails.length !== 1 ? 's' : ''}
                </span>
                <span className={styles.statPill}>
                  <IconBook /> {group.courseIds.length} course{group.courseIds.length !== 1 ? 's' : ''}
                </span>
              </div>

              {group.courseIds.length > 0 && (
                <div className={styles.coursePreview}>
                  {group.courseIds.slice(0, 3).map(cid => (
                    <span key={cid} className={styles.courseChip}>
                      Course {cid}
                    </span>
                  ))}
                  {group.courseIds.length > 3 && (
                    <span className={styles.courseChipMore}>
                      +{group.courseIds.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.cardActions}>
              {confirmDeleteId === group.id ? (
                <div className={styles.confirmDelete}>
                  <span className={styles.confirmText}>Delete?</span>
                  <button className={styles.btnConfirm} onClick={() => handleDelete(group.id)}>Yes</button>
                  <button className={styles.btnCancelDel} onClick={() => setConfirmDeleteId(null)}>No</button>
                </div>
              ) : (
                <>
                  <button className={styles.btnEdit} onClick={() => openEdit(group)}>
                    <IconEdit /> Edit
                  </button>
                  <button className={styles.btnDelete} onClick={() => setConfirmDeleteId(group.id)}>
                    <IconTrash /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <GroupModal
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
