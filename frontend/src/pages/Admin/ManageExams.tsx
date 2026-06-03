import { useState, useEffect } from 'react';
import styles from './ManageExams.module.css';
import ExamModal from './ExamModal';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MCQQuestion = {
  id: string;
  type: 'multiple-choice';
  text: string;
  options: string[];
  correctOption: number;
};

export type CodingQuestion = {
  id: string;
  type: 'coding';
  challengeId: string;
  challengeTitle: string;
};

export type Question = MCQQuestion | CodingQuestion;

export type ExamStatusOverride = '' | 'active' | 'stopped';

export interface Exam {
  id: string;
  title: string;
  durationMinutes: number;
  startDatetime: string;
  endDatetime: string;
  studentCount: number;
  groupIds: string[];
  statusOverride: ExamStatusOverride;
  questions: Question[];
}

// ── API mapping ───────────────────────────────────────────────────────────────

interface ApiExam {
  id: number;
  title: string;
  duration_minutes: number;
  start_datetime: string;
  end_datetime: string;
  student_count: number;
  group_ids: number[];
  status_override: string;
  questions: unknown;
}

function fromApi(raw: ApiExam): Exam {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    durationMinutes: raw.duration_minutes ?? 60,
    startDatetime: raw.start_datetime ?? '',
    endDatetime: raw.end_datetime ?? '',
    studentCount: raw.student_count ?? 0,
    groupIds: (raw.group_ids ?? []).map(String),
    statusOverride: (raw.status_override ?? '') as ExamStatusOverride,
    questions: Array.isArray(raw.questions) ? (raw.questions as Question[]) : [],
  };
}

function toApi(e: Omit<Exam, 'id' | 'statusOverride'>): object {
  return {
    title: e.title,
    duration_minutes: e.durationMinutes,
    start_datetime: e.startDatetime,
    end_datetime: e.endDatetime,
    student_count: e.studentCount,
    group_ids: e.groupIds.map(Number),
    questions: e.questions,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type ExamStatus = 'upcoming' | 'active' | 'completed' | 'stopped';

function examStatus(exam: Exam): ExamStatus {
  if (exam.statusOverride === 'stopped') return 'stopped';
  if (exam.statusOverride === 'active')  return 'active';
  const now   = new Date();
  const start = new Date(exam.startDatetime);
  const end   = new Date(exam.endDatetime);
  if (now < start) return 'upcoming';
  if (now > end)   return 'completed';
  return 'active';
}

function formatDatetime(dt: string) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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
function IconClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconStop() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
function IconRestart() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManageExams() {
  const [exams, setExams]     = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Exam | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadExams() {
    setLoading(true);
    apiFetch<ApiExam[]>('/api/exams')
      .then(data => setExams(data.map(fromApi)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadExams(); }, []);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(e: Exam) { setEditing(e); setModalOpen(true); }

  async function handleSave(data: Omit<Exam, 'id' | 'statusOverride'>) {
    const currentEditing = editing;
    setModalOpen(false);
    setEditing(null);
    setError('');
    try {
      if (currentEditing) {
        const updated = await apiFetch<ApiExam>(`/api/exams/${currentEditing.id}`, {
          method: 'PUT',
          body: JSON.stringify(toApi(data)),
        });
        setExams(prev => prev.map(e => e.id === currentEditing.id ? fromApi(updated) : e));
      } else {
        const created = await apiFetch<ApiExam>('/api/exams', {
          method: 'POST',
          body: JSON.stringify(toApi(data)),
        });
        setExams(prev => [...prev, fromApi(created)]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exam.');
      loadExams();
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    try {
      await apiFetch(`/api/exams/${id}`, { method: 'DELETE' });
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete exam.');
    }
  }

  async function handleControl(id: string, action: 'stop' | 'restart') {
    setError('');
    try {
      const updated = await apiFetch<ApiExam>(`/api/exams/${id}/${action}`, { method: 'POST' });
      setExams(prev => prev.map(e => e.id === id ? fromApi(updated) : e));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} exam.`);
    }
  }

  const STATUS_LABEL: Record<ExamStatus, string> = { upcoming: 'Upcoming', active: 'Active', completed: 'Completed', stopped: 'Stopped' };
  const STATUS_CLASS: Record<ExamStatus, string> = { upcoming: styles.statusUpcoming, active: styles.statusActive, completed: styles.statusCompleted, stopped: styles.statusStopped };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Admin</p>
          <h1 className={styles.headerTitle}>Manage Exams</h1>
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
          <h1 className={styles.headerTitle}>Manage Exams</h1>
          <p className={styles.headerSub}>{exams.length} exam{exams.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnCreate} onClick={openCreate}>
          <IconPlus /> Create Exam
        </button>
      </div>

      {error && <p style={{ color: 'var(--error, #f87171)', padding: '0 0 1rem' }}>{error}</p>}

      {/* ── Exam list ── */}
      <div className={styles.list}>
        {exams.length === 0 && (
          <div className={styles.empty}>No exams yet. Create your first one.</div>
        )}

        {exams.map(exam => {
          const status   = examStatus(exam);
          const mcqCount = exam.questions.filter(q => q.type === 'multiple-choice').length;
          const codCount = exam.questions.filter(q => q.type === 'coding').length;

          return (
            <div key={exam.id} className={styles.card}>

              {/* ── Card body ── */}
              <div className={styles.cardBody}>
                <div className={styles.cardLeft}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{exam.title}</h3>
                    <span className={`${styles.statusBadge} ${STATUS_CLASS[status]}`}>
                      {status === 'active' && <span className={styles.activeDot} />}
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      <IconClock />
                      {formatDatetime(exam.startDatetime)} — {formatDatetime(exam.endDatetime)}
                    </span>
                  </div>

                  <div className={styles.cardStats}>
                    <span className={styles.statPill}>
                      <IconClock /> {exam.durationMinutes} min
                    </span>
                    <span className={styles.statPill}>
                      <IconUsers /> {exam.studentCount} students
                    </span>
                    {mcqCount > 0 && (
                      <span className={styles.statPill}>{mcqCount} MCQ</span>
                    )}
                    {codCount > 0 && (
                      <span className={styles.statPill}>{codCount} coding</span>
                    )}
                  </div>
                </div>

                <div className={styles.cardActions}>
                  {confirmDeleteId === exam.id ? (
                    <div className={styles.confirmDelete}>
                      <span className={styles.confirmText}>Delete?</span>
                      <button className={styles.btnConfirm} onClick={() => handleDelete(exam.id)}>Yes</button>
                      <button className={styles.btnCancelDel} onClick={() => setConfirmDeleteId(null)}>No</button>
                    </div>
                  ) : (
                    <>
                      {status === 'active' && (
                        <button className={styles.btnStop} onClick={() => handleControl(exam.id, 'stop')}>
                          <IconStop /> Stop
                        </button>
                      )}
                      {(status === 'completed' || status === 'stopped') && (
                        <button className={styles.btnRestart} onClick={() => handleControl(exam.id, 'restart')}>
                          <IconRestart /> Restart
                        </button>
                      )}
                      <button className={styles.btnEdit} onClick={() => openEdit(exam)}>
                        <IconEdit /> Edit
                      </button>
                      <button className={styles.btnDelete} onClick={() => setConfirmDeleteId(exam.id)}>
                        <IconTrash /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ExamModal
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
