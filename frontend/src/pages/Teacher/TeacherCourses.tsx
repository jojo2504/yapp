import { useState, useEffect } from 'react';
import styles from '../Admin/ManageCourses.module.css';
import CourseModal from '../Admin/CourseModal';
import AssignGroupModal from '../Admin/AssignGroupModal';
import type { Course, MockGroup } from '../Admin/ManageCourses';
import { apiFetch } from '../../services/api';

// ── API mapping ───────────────────────────────────────────────────────────────

interface ApiCourse {
  id: number;
  name: string;
  description: string;
  challenge_ids: number[];
  group_ids: number[];
}

interface ApiGroup {
  id: number;
  name: string;
}

function courseFromApi(raw: ApiCourse): Course {
  return {
    id: String(raw.id),
    name: raw.name ?? '',
    description: raw.description ?? '',
    thumbnail: '',
    challengeIds: (raw.challenge_ids ?? []).map(String),
    groupIds: (raw.group_ids ?? []).map(String),
  };
}

function courseToApi(c: Omit<Course, 'id' | 'groupIds'>): object {
  return {
    name: c.name,
    description: c.description,
    challenge_ids: c.challengeIds.map(Number),
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups]   = useState<MockGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Course | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Course | null>(null);

  const groupNameMap: Record<string, string> = Object.fromEntries(groups.map(g => [g.id, g.name]));

  function loadAll() {
    setLoading(true);
    Promise.all([
      apiFetch<ApiCourse[]>('/api/courses'),
      apiFetch<ApiGroup[]>('/api/groups').catch(() => [] as ApiGroup[]),
    ])
      .then(([coursesData, groupsData]) => {
        setCourses(coursesData.map(courseFromApi));
        setGroups(groupsData.map(g => ({ id: String(g.id), name: g.name ?? '' })));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(c: Course) { setEditing(c); setModalOpen(true); }

  async function handleSave(data: Omit<Course, 'id' | 'groupIds'>) {
    const currentEditing = editing;
    setModalOpen(false);
    setEditing(null);
    setError('');
    try {
      if (currentEditing) {
        const updated = await apiFetch<ApiCourse>(`/api/courses/${currentEditing.id}`, {
          method: 'PUT',
          body: JSON.stringify(courseToApi(data)),
        });
        setCourses(prev => prev.map(c => c.id === currentEditing.id ? courseFromApi(updated) : c));
      } else {
        const created = await apiFetch<ApiCourse>('/api/courses', {
          method: 'POST',
          body: JSON.stringify(courseToApi(data)),
        });
        setCourses(prev => [...prev, courseFromApi(created)]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save course.');
      loadAll();
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    try {
      await apiFetch(`/api/courses/${id}`, { method: 'DELETE' });
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete course.');
    }
  }

  async function handleAssign(courseId: string, groupIds: string[]) {
    setAssignTarget(null);
    try {
      const updated = await apiFetch<ApiCourse>(`/api/courses/${courseId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ group_ids: groupIds.map(Number) }),
      });
      setCourses(prev => prev.map(c => c.id === courseId ? courseFromApi(updated) : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign groups.');
    }
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Teacher</p>
          <h1 className={styles.headerTitle}>My Courses</h1>
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
          <p className={styles.headerLabel}>Teacher</p>
          <h1 className={styles.headerTitle}>My Courses</h1>
          <p className={styles.headerSub}>{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnCreate} onClick={openCreate}>
          <IconPlus /> Create Course
        </button>
      </div>

      {error && <p style={{ color: 'var(--error, #f87171)', padding: '0 0 1rem' }}>{error}</p>}

      {/* ── Course list ── */}
      <div className={styles.list}>
        {courses.length === 0 && (
          <div className={styles.empty}>No courses yet. Create your first one.</div>
        )}

        {courses.map(course => (
          <div key={course.id} className={styles.card}>

            {/* Thumbnail */}
            <div className={styles.thumbnail}>
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.name}
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
                <h3 className={styles.cardTitle}>{course.name}</h3>
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
                  {course.groupIds.slice(0, 4).map(gid => (
                    <span key={gid} className={styles.groupBadge}>
                      <IconUsers />
                      {groupNameMap[gid] ?? `Group ${gid}`}
                    </span>
                  ))}
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
          groups={groups}
          onClose={() => setAssignTarget(null)}
          onConfirm={(groupIds) => handleAssign(assignTarget.id, groupIds)}
        />
      )}
    </div>
  );
}
