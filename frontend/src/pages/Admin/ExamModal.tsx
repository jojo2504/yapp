import { useState, useEffect, useCallback } from 'react';
import type { Exam, MCQQuestion, CodingQuestion, Question } from './ManageExams';
import styles from './ExamModal.module.css';
import { apiFetch } from '../../services/api';

// ── Group types ─────────────────────────────────────────────────────────────

interface ApiGroup {
  id: number;
  name: string;
  students: string[];
}

interface GroupOption {
  id: string;
  name: string;
  studentCount: number;
}

interface ApiChallenge {
  id: number;
  title: string;
}

interface ChallengeOption {
  id: string;
  title: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ── Types ─────────────────────────────────────────────────────────────────────

type ExamForm = Omit<Exam, 'id' | 'studentCount' | 'statusOverride'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function toDatetimeLocal(iso: string) {
  // Ensure the value is in 'YYYY-MM-DDTHH:mm' format for datetime-local
  return iso.slice(0, 16);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSmallX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ── Empty form factory ────────────────────────────────────────────────────────

function emptyForm(): ExamForm {
  return {
    title: '',
    durationMinutes: 60,
    startDatetime: '',
    endDatetime: '',
    groupIds: [],
    questions: [],
  };
}

function formFromExam(exam: Exam): ExamForm {
  return {
    title:           exam.title,
    durationMinutes: exam.durationMinutes,
    startDatetime:   toDatetimeLocal(exam.startDatetime),
    endDatetime:     toDatetimeLocal(exam.endDatetime),
    groupIds:        [...exam.groupIds],
    questions:       exam.questions.map(q => ({ ...q })),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MCQEditorProps {
  q: MCQQuestion;
  index: number;
  onChange: (q: MCQQuestion) => void;
  onRemove: () => void;
}

function MCQEditor({ q, index, onChange, onRemove }: MCQEditorProps) {
  function setOption(i: number, val: string) {
    const next = [...q.options];
    next[i] = val;
    onChange({ ...q, options: next });
  }

  return (
    <div className={styles.questionCard}>
      <div className={styles.questionCardHeader}>
        <div className={styles.questionMeta}>
          <span className={styles.questionNum}>Q{index + 1}</span>
          <span className={styles.questionTypeBadge}>Multiple Choice</span>
        </div>
        <button type="button" className={styles.btnRemoveQ} onClick={onRemove} aria-label="Remove question">
          <IconSmallX />
        </button>
      </div>

      <div className={styles.qField}>
        <label className={styles.qLabel}>Question</label>
        <textarea
          className={styles.qTextarea}
          placeholder="Enter the question text…"
          value={q.text}
          onChange={e => onChange({ ...q, text: e.target.value })}
          rows={2}
        />
      </div>

      <div className={styles.optionsGrid}>
        {q.options.map((opt, i) => (
          <div key={i} className={`${styles.optionRow} ${q.correctOption === i ? styles.optionRowCorrect : ''}`}>
            <button
              type="button"
              className={`${styles.correctBtn} ${q.correctOption === i ? styles.correctBtnActive : ''}`}
              onClick={() => onChange({ ...q, correctOption: i })}
              title="Mark as correct answer"
            >
              {OPTION_LABELS[i]}
            </button>
            <input
              type="text"
              className={styles.optionInput}
              placeholder={`Option ${OPTION_LABELS[i]}`}
              value={opt}
              onChange={e => setOption(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <p className={styles.correctHint}>
        Click a letter button to mark it as the correct answer.
        {q.correctOption >= 0 && ` Option ${OPTION_LABELS[q.correctOption]} is marked correct.`}
      </p>
    </div>
  );
}

interface CodingEditorProps {
  q: CodingQuestion;
  index: number;
  challenges: ChallengeOption[];
  challengesLoading: boolean;
  onChange: (q: CodingQuestion) => void;
  onRemove: () => void;
}

function CodingEditor({ q, index, challenges, challengesLoading, onChange, onRemove }: CodingEditorProps) {
  return (
    <div className={styles.questionCard}>
      <div className={styles.questionCardHeader}>
        <div className={styles.questionMeta}>
          <span className={styles.questionNum}>Q{index + 1}</span>
          <span className={`${styles.questionTypeBadge} ${styles.questionTypeCoding}`}>Coding Challenge</span>
        </div>
        <button type="button" className={styles.btnRemoveQ} onClick={onRemove} aria-label="Remove question">
          <IconSmallX />
        </button>
      </div>

      <div className={styles.qField}>
        <label className={styles.qLabel}>Linked Challenge</label>
        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={q.challengeId}
            onChange={e => {
              const challenge = challenges.find(c => c.id === e.target.value);
              onChange({ ...q, challengeId: e.target.value, challengeTitle: challenge?.title ?? '' });
            }}
          >
            <option value="">
              {challengesLoading
                ? 'Loading challenges…'
                : challenges.length === 0
                  ? '— No challenges available —'
                  : '— Select a challenge —'}
            </option>
            {/* Keep the linked challenge selectable even if it's not in the list. */}
            {q.challengeId && !challenges.some(c => c.id === q.challengeId) && (
              <option value={q.challengeId}>{q.challengeTitle || `Challenge ${q.challengeId}`}</option>
            )}
            {challenges.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initial: Exam | null;
  onClose: () => void;
  onSave: (data: Omit<Exam, 'id' | 'statusOverride'>) => void;
}

export default function ExamModal({ initial, onClose, onSave }: Props) {
  const [form, setForm]       = useState<ExamForm>(initial ? formFromExam(initial) : emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [groups, setGroups]         = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [challenges, setChallenges] = useState<ChallengeOption[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    setGroupsLoading(true);
    apiFetch<ApiGroup[]>('/api/groups')
      .then(data => {
        if (cancelled) return;
        setGroups(data.map(g => ({
          id: String(g.id),
          name: g.name ?? '',
          studentCount: (g.students ?? []).length,
        })));
      })
      .catch(() => { if (!cancelled) setGroups([]); })
      .finally(() => { if (!cancelled) setGroupsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setChallengesLoading(true);
    apiFetch<ApiChallenge[]>('/api/challenges')
      .then(data => {
        if (cancelled) return;
        setChallenges(data.map(c => ({ id: String(c.id), title: c.title ?? `Challenge ${c.id}` })));
      })
      .catch(() => { if (!cancelled) setChallenges([]); })
      .finally(() => { if (!cancelled) setChallengesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function toggleGroup(id: string) {
    setForm(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(id)
        ? prev.groupIds.filter(g => g !== id)
        : [...prev.groupIds, id],
    }));
  }

  // ── Question helpers ─────────────────────────────────────────────────────────

  function addMCQ() {
    const newQ: MCQQuestion = {
      id:            generateId(),
      type:          'multiple-choice',
      text:          '',
      options:       ['', '', '', ''],
      correctOption: 0,
    };
    setForm(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
  }

  function addCoding() {
    const newQ: CodingQuestion = {
      id:             generateId(),
      type:           'coding',
      challengeId:    '',
      challengeTitle: '',
    };
    setForm(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
  }

  function updateQuestion(id: string, updated: Question) {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? updated : q),
    }));
  }

  function removeQuestion(id: string) {
    setForm(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim())         { setError('Title is required.');            return; }
    if (!form.startDatetime)        { setError('Start date/time is required.');  return; }
    if (!form.endDatetime)          { setError('End date/time is required.');    return; }
    if (form.endDatetime <= form.startDatetime) {
      setError('End date/time must be after start date/time.');
      return;
    }
    setError('');
    setLoading(true);
    // The actual API call (with auth) happens in the parent's onSave handler.
    const studentCount = groups
      .filter(g => form.groupIds.includes(g.id))
      .reduce((sum, g) => sum + g.studentCount, 0);
    onSave({ ...form, studentCount });
  }

  const isEditing  = Boolean(initial);
  const mcqCount   = form.questions.filter(q => q.type === 'multiple-choice').length;
  const codeCount  = form.questions.filter(q => q.type === 'coding').length;

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>{isEditing ? 'Editing exam' : 'New exam'}</p>
            <h2 className={styles.modalTitle}>{isEditing ? 'Edit Exam' : 'Create Exam'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <IconX />
          </button>
        </div>

        {/* ── Body ── */}
        <form id="exam-form" className={styles.modalBody} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.errorBanner}>{error}</p>}

          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ex-title">Title</label>
            <input
              id="ex-title"
              type="text"
              className={styles.input}
              placeholder="e.g. Data Structures Final Exam"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Duration + Datetime row */}
          <div className={styles.row3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ex-dur">Duration (minutes)</label>
              <input
                id="ex-dur"
                type="number"
                min={1}
                className={styles.input}
                placeholder="60"
                value={form.durationMinutes}
                onChange={e => setForm(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="ex-start">Start Date &amp; Time</label>
              <input
                id="ex-start"
                type="datetime-local"
                className={styles.input}
                value={form.startDatetime}
                onChange={e => setForm(prev => ({ ...prev, startDatetime: e.target.value }))}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="ex-end">End Date &amp; Time</label>
              <input
                id="ex-end"
                type="datetime-local"
                className={styles.input}
                value={form.endDatetime}
                onChange={e => setForm(prev => ({ ...prev, endDatetime: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Groups ── */}
          <div className={styles.groupsSection}>
            <div className={styles.groupsSectionHeader}>
              <span className={styles.label}>Assigned Groups</span>
              {form.groupIds.length > 0 && (
                <span className={styles.questionCount}>{form.groupIds.length} selected</span>
              )}
            </div>
            <p className={styles.groupsHint}>
              Select one or more groups whose students will sit this exam.
            </p>

            {groupsLoading ? (
              <div className={styles.emptyQuestions}>Loading groups…</div>
            ) : groups.length === 0 ? (
              <div className={styles.emptyQuestions}>
                No groups exist yet. Create a group first to assign students.
              </div>
            ) : (
              <div className={styles.groupChecklist}>
                {groups.map(group => {
                  const checked = form.groupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`${styles.groupItem} ${checked ? styles.groupItemChecked : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.groupCheckbox}
                        checked={checked}
                        onChange={() => toggleGroup(group.id)}
                      />
                      <span className={styles.groupIcon}><IconUsers /></span>
                      <span className={styles.groupName}>{group.name}</span>
                      <span className={styles.groupStudentCount}>
                        {group.studentCount} student{group.studentCount !== 1 ? 's' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Questions ── */}
          <div className={styles.questionsSection}>
            <div className={styles.questionsSectionHeader}>
              <div>
                <span className={styles.label}>Questions</span>
                {form.questions.length > 0 && (
                  <span className={styles.questionCount}>
                    {form.questions.length} total
                    {mcqCount > 0   && ` · ${mcqCount} MCQ`}
                    {codeCount > 0  && ` · ${codeCount} coding`}
                  </span>
                )}
              </div>
              <div className={styles.addQuestionBtns}>
                <button type="button" className={styles.btnAddMCQ} onClick={addMCQ}>
                  + Multiple Choice
                </button>
                <button type="button" className={styles.btnAddCoding} onClick={addCoding}>
                  + Coding Challenge
                </button>
              </div>
            </div>

            {form.questions.length === 0 && (
              <div className={styles.emptyQuestions}>
                No questions yet. Use the buttons above to add multiple choice or coding questions.
              </div>
            )}

            <div className={styles.questionList}>
              {form.questions.map((q, i) =>
                q.type === 'multiple-choice' ? (
                  <MCQEditor
                    key={q.id}
                    q={q}
                    index={i}
                    onChange={updated => updateQuestion(q.id, updated)}
                    onRemove={() => removeQuestion(q.id)}
                  />
                ) : (
                  <CodingEditor
                    key={q.id}
                    q={q}
                    index={i}
                    challenges={challenges}
                    challengesLoading={challengesLoading}
                    onChange={updated => updateQuestion(q.id, updated)}
                    onRemove={() => removeQuestion(q.id)}
                  />
                )
              )}
            </div>
          </div>
        </form>

        {/* ── Footer ── */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button
            type="submit"
            form="exam-form"
            className={styles.btnSave}
            disabled={loading}
          >
            {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Exam'}
          </button>
        </div>

      </div>
    </div>
  );
}
