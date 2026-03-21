import { useState } from 'react';
import styles from '../Admin/ManageGroups.module.css';
import GroupModal from '../Admin/GroupModal';
import type { Group } from '../Admin/ManageGroups';
import { LS } from '../../constants/storage';

// ── Types ─────────────────────────────────────────────────────────────────────

type TeacherGroup = Group & { teacherId: string };

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_KEY = LS.T_GROUPS;

function getTeacherId(): string {
  try {
    const raw = localStorage.getItem(LS.USER);
    if (raw) return (JSON.parse(raw) as { teacherId?: string }).teacherId ?? '';
  } catch { /* ignore */ }
  return '';
}

function load(): TeacherGroup[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as TeacherGroup[];
  } catch { /* ignore */ }
  return [];
}

function persist(items: TeacherGroup[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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

export default function TeacherGroups() {
  const teacherId = getTeacherId();
  const [all, setAll]   = useState<TeacherGroup[]>(load);
  const mine             = all.filter(g => g.teacherId === teacherId);

  const [modalOpen, setModalOpen]             = useState(false);
  const [editing, setEditing]                 = useState<Group | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function update(updated: TeacherGroup[]) {
    setAll(updated);
    persist(updated);
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(g: TeacherGroup) { setEditing(g); setModalOpen(true); }

  function handleSave(data: Omit<Group, 'id'>) {
    if (editing) {
      update(all.map(g =>
        g.id === editing.id ? { ...data, id: g.id, teacherId: g.teacherId } : g
      ));
    } else {
      update([...all, { ...data, id: generateId(), teacherId }]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    update(all.filter(g => g.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Teacher</p>
          <h1 className={styles.headerTitle}>My Groups</h1>
          <p className={styles.headerSub}>{mine.length} group{mine.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnCreate} onClick={openCreate}>
          <IconPlus /> Create New Group
        </button>
      </div>

      {/* ── Group list ── */}
      <div className={styles.list}>
        {mine.length === 0 && (
          <div className={styles.empty}>No groups yet. Create your first one.</div>
        )}

        {mine.map(group => (
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

              {group.studentEmails.length > 0 && (
                <div className={styles.coursePreview}>
                  {group.studentEmails.slice(0, 3).map(email => (
                    <span key={email} className={styles.courseChip}>
                      {email}
                    </span>
                  ))}
                  {group.studentEmails.length > 3 && (
                    <span className={styles.courseChipMore}>
                      +{group.studentEmails.length - 3} more
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
