import { useState } from 'react';
import styles from '../Admin/ManageCourses.module.css';
import CourseModal from '../Admin/CourseModal';
import AssignGroupModal from '../Admin/AssignGroupModal';
import type { Course, MockGroup } from '../Admin/ManageCourses';
import type { Group } from '../Admin/ManageGroups';
import { LS } from '../../constants/storage';

// ── Types ─────────────────────────────────────────────────────────────────────

type TeacherCourse = Course & { teacherId: string };
type StoredGroup   = Group & { teacherId: string };

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_COURSES = LS.T_COURSES;
const LS_GROUPS  = LS.T_GROUPS;

function getTeacherId(): string {
  try {
    const raw = localStorage.getItem(LS.USER);
    if (raw) return (JSON.parse(raw) as { teacherId?: string }).teacherId ?? '';
  } catch { /* ignore */ }
  return '';
}

function loadCourses(): TeacherCourse[] {
  try {
    const raw = localStorage.getItem(LS_COURSES);
    if (raw) return JSON.parse(raw) as TeacherCourse[];
  } catch { /* ignore */ }
  return [];
}

function loadMyGroups(teacherId: string): MockGroup[] {
  try {
    const raw = localStorage.getItem(LS_GROUPS);
    if (raw) {
      const all = JSON.parse(raw) as StoredGroup[];
      return all
        .filter(g => g.teacherId === teacherId)
        .map(g => ({ id: g.id, name: g.name }));
    }
  } catch { /* ignore */ }
  return [];
}

function persistCourses(items: TeacherCourse[]): void {
  localStorage.setItem(LS_COURSES, JSON.stringify(items));
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
function IconBook() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
function IconBolt() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconUserPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeacherCourses() {
  const teacherId  = getTeacherId();
  const [all, setAll]     = useState<TeacherCourse[]>(loadCourses);
  const mine               = all.filter(c => c.teacherId === teacherId);

  const [modalOpen, setModalOpen]           = useState(false);
  const [editing, setEditing]               = useState<Course | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget]       = useState<TeacherCourse | null>(null);

  function update(updated: TeacherCourse[]) {
    setAll(updated);
    persistCourses(updated);
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(c: TeacherCourse) { setEditing(c); setModalOpen(true); }

  function handleSave(data: Omit<Course, 'id' | 'groupIds'>) {
    if (editing) {
      update(all.map(c =>
        c.id === editing.id ? { ...data, id: c.id, groupIds: c.groupIds, teacherId: c.teacherId } : c
      ));
    } else {
      update([...all, { ...data, id: generateId(), groupIds: [], teacherId }]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    update(all.filter(c => c.id !== id));
    setConfirmDeleteId(null);
  }

  function handleAssign(courseId: string, groupIds: string[]) {
    update(all.map(c => c.id === courseId ? { ...c, groupIds } : c));
    setAssignTarget(null);
  }

  const myGroups = loadMyGroups(teacherId);

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Teacher</p>
          <h1 className={styles.headerTitle}>My Courses</h1>
          <p className={styles.headerSub}>{mine.length} course{mine.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnCreate} onClick={openCreate}>
          <IconPlus /> Create Course
        </button>
      </div>

      {/* ── Course list ── */}
      <div className={styles.list}>
        {mine.length === 0 && (
          <div className={styles.empty}>No courses yet. Create your first one.</div>
        )}

        {mine.map(course => (
          <div key={course.id} className={styles.card}>

            {/* Thumbnail */}
            <div className={styles.thumbnail}>
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className={styles.thumbnailImg}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className={styles.thumbnailPlaceholder}>
                  <IconBook />
                </div>
              )}
            </div>

            {/* Content */}
            <div className={styles.cardContent}>
              <div className={styles.cardTop}>
                <h3 className={styles.cardTitle}>{course.title}</h3>
              </div>
              <p className={styles.cardDesc}>{course.description}</p>

              <div className={styles.cardStats}>
                <span className={styles.statPill}>
                  <IconBolt /> {course.challengeIds.length} challenge{course.challengeIds.length !== 1 ? 's' : ''}
                </span>
                <span className={styles.statPill}>
                  <IconUsers /> {course.groupIds.length} group{course.groupIds.length !== 1 ? 's' : ''}
                </span>
              </div>

              {course.groupIds.length > 0 && (
                <div className={styles.groupPreview}>
                  {course.groupIds.slice(0, 4).map(gid => {
                    const g = myGroups.find(x => x.id === gid);
                    return (
                      <span key={gid} className={styles.groupBadge}>
                        <IconUsers />
                        {g ? g.name : `Group ${gid}`}
                      </span>
                    );
                  })}
                  {course.groupIds.length > 4 && (
                    <span className={styles.groupBadgeMore}>
                      +{course.groupIds.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.cardActions}>
              {confirmDeleteId === course.id ? (
                <div className={styles.confirmDelete}>
                  <span className={styles.confirmText}>Delete?</span>
                  <button className={styles.btnConfirm} onClick={() => handleDelete(course.id)}>Yes</button>
                  <button className={styles.btnCancelDel} onClick={() => setConfirmDeleteId(null)}>No</button>
                </div>
              ) : (
                <>
                  <button className={styles.btnAssign} onClick={() => setAssignTarget(course)}>
                    <IconUserPlus /> Assign to Group
                  </button>
                  <button className={styles.btnEdit} onClick={() => openEdit(course)}>
                    <IconEdit /> Edit
                  </button>
                  <button className={styles.btnDelete} onClick={() => setConfirmDeleteId(course.id)}>
                    <IconTrash /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Edit/Create Modal ── */}
      {modalOpen && (
        <CourseModal
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {/* ── Assign Group Modal ── */}
      {assignTarget && (
        <AssignGroupModal
          course={assignTarget}
          groups={myGroups}
          onClose={() => setAssignTarget(null)}
          onConfirm={(groupIds) => handleAssign(assignTarget.id, groupIds)}
        />
      )}
    </div>
  );
}
