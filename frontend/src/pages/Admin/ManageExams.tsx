import { useState, useEffect } from 'react';
import styles from './ManageExams.module.css';
import ExamModal from './ExamModal';
import { mockExams } from '../../mock/data';
import { LS } from '../../constants/storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MCQQuestion = {
  id: string;
  type: 'multiple-choice';
  text: string;
  options: string[];      // exactly 4
  correctOption: number;  // 0–3
};

export type CodingQuestion = {
  id: string;
  type: 'coding';
  challengeId: string;
  challengeTitle: string;
};

export type Question = MCQQuestion | CodingQuestion;

export interface Violation {
  id: string;
  studentName: string;
  violationType: string;
  duration: string;
  timestamp: string;
}

export interface Exam {
  id: string;
  title: string;
  durationMinutes: number;
  startDatetime: string;  // 'YYYY-MM-DDTHH:mm'
  endDatetime: string;
  studentCount: number;
  questions: Question[];
  violations: Violation[];
}

// ── Mock data ─────────────────────────────────────────────────────────────────

// mockExams imported from ../../mock/data

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function examStatus(exam: Exam): 'upcoming' | 'active' | 'completed' {
  const now   = new Date();
  const start = new Date(exam.startDatetime);
  const end   = new Date(exam.endDatetime);
  if (now < start) return 'upcoming';
  if (now > end)   return 'completed';
  return 'active';
}

function formatDatetime(dt: string) {
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
function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <polyline points="6 9 12 15 18 9" />
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
function IconUsers() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ── Violation type badge colour ────────────────────────────────────────────────

const VIOLATION_COLORS: Record<string, string> = {
  'Tab Switch':           styles.vtBlue,
  'Copy-Paste':           styles.vtAmber,
  'Full Screen Exit':     styles.vtOrange,
  'Multiple Faces':       styles.vtRed,
  'Screen Share Disabled': styles.vtPurple,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManageExams() {
  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const raw = localStorage.getItem(LS.A_EXAMS);
      if (raw) return JSON.parse(raw) as Exam[];
    } catch { /* ignore */ }
    return mockExams as Exam[];
  });
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Exam | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [violationsOpenId, setViolationsOpenId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(LS.A_EXAMS, JSON.stringify(exams));
  }, [exams]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(e: Exam) { setEditing(e); setModalOpen(true); }

  function handleSave(data: Omit<Exam, 'id' | 'violations'>) {
    if (editing) {
      setExams(prev => prev.map(e =>
        e.id === editing.id ? { ...data, id: e.id, violations: e.violations } : e
      ));
    } else {
      setExams(prev => [...prev, { ...data, id: generateId(), violations: [] }]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    try { await fetch(`/api/exams/${id}`, { method: 'DELETE' }); } catch { /* optimistic */ }
    setExams(prev => prev.filter(e => e.id !== id));
    setConfirmDeleteId(null);
    if (violationsOpenId === id) setViolationsOpenId(null);
  }

  const STATUS_LABEL = { upcoming: 'Upcoming', active: 'Active', completed: 'Completed' };
  const STATUS_CLASS = { upcoming: styles.statusUpcoming, active: styles.statusActive, completed: styles.statusCompleted };

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

      {/* ── Exam list ── */}
      <div className={styles.list}>
        {exams.length === 0 && (
          <div className={styles.empty}>No exams yet. Create your first one.</div>
        )}

        {exams.map(exam => {
          const status   = examStatus(exam);
          const vOpen    = violationsOpenId === exam.id;
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
                  {/* Violations toggle */}
                  <button
                    className={`${styles.btnViolations} ${vOpen ? styles.btnViolationsOpen : ''}`}
                    onClick={() => setViolationsOpenId(vOpen ? null : exam.id)}
                  >
                    <IconShield />
                    Violations
                    {exam.violations.length > 0 && (
                      <span className={styles.violationCount}>{exam.violations.length}</span>
                    )}
                    <IconChevron open={vOpen} />
                  </button>

                  {confirmDeleteId === exam.id ? (
                    <div className={styles.confirmDelete}>
                      <span className={styles.confirmText}>Delete?</span>
                      <button className={styles.btnConfirm} onClick={() => handleDelete(exam.id)}>Yes</button>
                      <button className={styles.btnCancelDel} onClick={() => setConfirmDeleteId(null)}>No</button>
                    </div>
                  ) : (
                    <>
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

              {/* ── Violations accordion ── */}
              {vOpen && (
                <div className={styles.violationsSection}>
                  <div className={styles.violationsSectionHeader}>
                    <span className={styles.violationsSectionTitle}>
                      Student Violations
                    </span>
                    <span className={styles.violationsSectionCount}>
                      {exam.violations.length} record{exam.violations.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {exam.violations.length === 0 ? (
                    <p className={styles.noViolations}>No violations recorded for this exam.</p>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Violation Type</th>
                            <th>Duration</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exam.violations.map(v => (
                            <tr key={v.id}>
                              <td className={styles.tdName}>{v.studentName}</td>
                              <td>
                                <span className={`${styles.violationTypeBadge} ${VIOLATION_COLORS[v.violationType] ?? styles.vtBlue}`}>
                                  {v.violationType}
                                </span>
                              </td>
                              <td className={styles.tdMono}>{v.duration}</td>
                              <td className={styles.tdMono}>{v.timestamp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
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
