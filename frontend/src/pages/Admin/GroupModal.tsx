import { useState, useEffect, useCallback, useRef } from 'react';
import type { Group } from './ManageGroups';
import styles from './GroupModal.module.css';
import { apiFetch } from '../../services/api';

// ── Course data for the picker ─────────────────────────────────────────────

interface PickerCourse {
  id: string;
  title: string;
}

const ALL_COURSES: PickerCourse[] = [];

// ── Student directory types ────────────────────────────────────────────────

interface ApiStudent {
  id: number;
  name: string;
  email: string;
}

interface StudentOption {
  id: string;
  name: string;
  email: string;
}

type AddMode = 'email' | 'select';

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
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initial: Group | null;
  onClose: () => void;
  onSave: (data: Omit<Group, 'id'>) => void;
}

// ── Form shape ────────────────────────────────────────────────────────────────

interface GroupForm {
  name: string;
  studentEmails: string[];
  courseIds: string[];
}

function emptyForm(): GroupForm {
  return { name: '', studentEmails: [], courseIds: [] };
}

function formFromGroup(g: Group): GroupForm {
  return {
    name: g.name,
    studentEmails: [...g.studentEmails],
    courseIds: [...g.courseIds],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupModal({ initial, onClose, onSave }: Props) {
  const [form, setForm]         = useState<GroupForm>(initial ? formFromGroup(initial) : emptyForm());
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [addMode, setAddMode] = useState<AddMode>('email');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

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

  // ── Student email helpers ──────────────────────────────────────────────────

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (form.studentEmails.includes(email)) {
      setEmailError('This email is already in the list.');
      return;
    }
    setEmailError('');
    setForm(prev => ({ ...prev, studentEmails: [...prev.studentEmails, email] }));
    setEmailInput('');
    emailInputRef.current?.focus();
  }

  function removeEmail(email: string) {
    setForm(prev => ({ ...prev, studentEmails: prev.studentEmails.filter(e => e !== email) }));
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  }

  // ── Student picker helpers ─────────────────────────────────────────────────

  // Lazy-load the student directory the first time the picker is opened.
  useEffect(() => {
    if (addMode !== 'select' || studentsLoaded) return;
    let cancelled = false;
    setStudentsLoading(true);
    apiFetch<ApiStudent[]>('/api/students')
      .then(data => {
        if (cancelled) return;
        setStudents(data.map(s => ({
          id: String(s.id),
          name: s.name ?? '',
          email: (s.email ?? '').toLowerCase(),
        })));
      })
      .catch(() => { if (!cancelled) setStudents([]); })
      .finally(() => { if (!cancelled) { setStudentsLoading(false); setStudentsLoaded(true); } });
    return () => { cancelled = true; };
  }, [addMode, studentsLoaded]);

  function toggleStudent(email: string) {
    setForm(prev => ({
      ...prev,
      studentEmails: prev.studentEmails.includes(email)
        ? prev.studentEmails.filter(e => e !== email)
        : [...prev.studentEmails, email],
    }));
  }

  const filteredStudents = students.filter(s => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.email.includes(q);
  });

  // ── Course picker helpers ──────────────────────────────────────────────────

  function toggleCourse(id: string) {
    setForm(prev => {
      if (prev.courseIds.includes(id)) {
        return { ...prev, courseIds: prev.courseIds.filter(c => c !== id) };
      }
      return { ...prev, courseIds: [...prev.courseIds, id] };
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Group name is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const url    = initial ? `/api/groups/${initial.id}` : '/api/groups';
      const method = initial ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          form.name,
          studentEmails: form.studentEmails,
          courseIds:     form.courseIds,
          ...(initial ? { id: initial.id } : {}),
        }),
      });
    } catch { /* optimistic */ } finally {
      setLoading(false);
      onSave(form);
    }
  }

  const isEditing = Boolean(initial);

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>{isEditing ? 'Editing group' : 'New group'}</p>
            <h2 className={styles.modalTitle}>{isEditing ? 'Edit Group' : 'Create Group'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <IconX />
          </button>
        </div>

        {/* ── Body ── */}
        <form id="group-form" className={styles.modalBody} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.errorBanner}>{error}</p>}

          {/* Group name */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="gr-name">Group Name</label>
            <input
              id="gr-name"
              type="text"
              className={styles.input}
              placeholder="e.g. CS101 — Fall 2024"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* Students */}
          <div className={styles.field}>
            <label className={styles.label}>
              Students
              <span className={styles.labelCount}>{form.studentEmails.length} added</span>
            </label>

            {/* Mode toggle */}
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeBtn} ${addMode === 'email' ? styles.modeBtnActive : ''}`}
                onClick={() => setAddMode('email')}
              >
                Add by email
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${addMode === 'select' ? styles.modeBtnActive : ''}`}
                onClick={() => setAddMode('select')}
              >
                Select students
              </button>
            </div>

            {addMode === 'email' ? (
              <>
                <div className={styles.emailInputRow}>
                  <input
                    id="gr-email"
                    ref={emailInputRef}
                    type="email"
                    className={styles.input}
                    placeholder="student@example.com"
                    value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                    onKeyDown={handleEmailKeyDown}
                  />
                  <button
                    type="button"
                    className={styles.btnAddEmail}
                    onClick={addEmail}
                  >
                    <IconPlus /> Add
                  </button>
                </div>
                {emailError && <p className={styles.fieldError}>{emailError}</p>}
                {form.studentEmails.length === 0 && (
                  <p className={styles.emailHint}>
                    Type an email and press Enter or click Add.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className={styles.searchRow}>
                  <span className={styles.searchIcon}><IconSearch /></span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search students by name or email…"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                </div>

                {studentsLoading ? (
                  <p className={styles.emailHint}>Loading students…</p>
                ) : students.length === 0 ? (
                  <p className={styles.emailHint}>No students found.</p>
                ) : (
                  <div className={styles.studentList}>
                    {filteredStudents.length === 0 && (
                      <p className={styles.emailHint}>No students match “{studentSearch}”.</p>
                    )}
                    {filteredStudents.map(student => {
                      const checked = form.studentEmails.includes(student.email);
                      return (
                        <label
                          key={student.id}
                          className={`${styles.studentItem} ${checked ? styles.studentItemChecked : ''}`}
                        >
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={checked}
                            onChange={() => toggleStudent(student.email)}
                          />
                          <span className={styles.studentInfo}>
                            <span className={styles.studentName}>{student.name}</span>
                            <span className={styles.studentEmail}>{student.email}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Shared list of added students (both modes feed this) */}
            {form.studentEmails.length > 0 && (
              <div className={styles.emailTags}>
                {form.studentEmails.map(email => (
                  <span key={email} className={styles.emailTag}>
                    {email}
                    <button
                      type="button"
                      className={styles.emailTagRemove}
                      onClick={() => removeEmail(email)}
                      aria-label={`Remove ${email}`}
                    >
                      <IconSmallX />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Course picker */}
          <div className={styles.field}>
            <div className={styles.pickerHeader}>
              <span className={styles.label}>Assign Courses</span>
              <span className={styles.pickerCount}>
                {form.courseIds.length} of {ALL_COURSES.length} selected
              </span>
            </div>

            <div className={styles.checklist}>
              {ALL_COURSES.map(course => {
                const checked = form.courseIds.includes(course.id);
                return (
                  <label
                    key={course.id}
                    className={`${styles.checkItem} ${checked ? styles.checkItemChecked : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={checked}
                      onChange={() => toggleCourse(course.id)}
                    />
                    <span className={styles.checkItemTitle}>{course.title}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>

        {/* ── Footer ── */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button
            type="submit"
            form="group-form"
            className={styles.btnSave}
            disabled={loading}
          >
            {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Group'}
          </button>
        </div>

      </div>
    </div>
  );
}
