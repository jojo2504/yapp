import { useState, useEffect, useCallback, useRef } from 'react';
import type { Course } from './ManageCourses';
import styles from './CourseModal.module.css';
import { apiFetch } from '../../services/api';

// ── Challenge data for the picker ─────────────────────────────────────────────

type PickerDifficulty = 'Easy' | 'Medium' | 'Hard';

interface PickerChallenge {
  id: string;
  title: string;
  difficulty: PickerDifficulty;
  category: string;
}

interface ApiChallenge {
  id: number;
  title: string;
  difficulty: string;
  category: string;
}

const DIFF_CLASS: Record<PickerDifficulty, string> = {
  Easy:   styles.diffEasy,
  Medium: styles.diffMedium,
  Hard:   styles.diffHard,
};

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
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Six-dot drag handle
function IconGrip() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9"  cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
      <circle cx="9"  cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9"  cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initial: Course | null;
  onClose: () => void;
  onSave: (data: Omit<Course, 'id' | 'groupIds'>) => void;
}

// ── Form shape ────────────────────────────────────────────────────────────────

interface CourseForm {
  name: string;
  description: string;
  thumbnail: string;
  challengeIds: string[]; // ordered
}

function emptyForm(): CourseForm {
  return { name: '', description: '', thumbnail: '', challengeIds: [] };
}

function formFromCourse(c: Course): CourseForm {
  return { name: c.name, description: c.description, thumbnail: c.thumbnail, challengeIds: [...c.challengeIds] };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseModal({ initial, onClose, onSave }: Props) {
  const [form, setForm]       = useState<CourseForm>(initial ? formFromCourse(initial) : emptyForm());
  const [error, setError]     = useState('');
  const [imgError, setImgError] = useState(false);

  const [challenges, setChallenges]           = useState<PickerChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

  // ── Drag state ────────────────────────────────────────────────────────────────
  const dragIdx     = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

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

  // Fetch available challenges for the picker
  useEffect(() => {
    apiFetch<ApiChallenge[]>('/api/challenges')
      .then(data => setChallenges(data.map(c => ({
        id: String(c.id),
        title: c.title ?? '',
        difficulty: (['Easy', 'Medium', 'Hard'].includes(c.difficulty) ? c.difficulty : 'Easy') as PickerDifficulty,
        category: c.category ?? '',
      }))))
      .catch(() => { /* leave picker empty on error */ })
      .finally(() => setChallengesLoading(false));
  }, []);

  // Reset img error when thumbnail changes
  useEffect(() => { setImgError(false); }, [form.thumbnail]);

  // ── Challenge picker helpers ──────────────────────────────────────────────────

  function toggleChallenge(id: string) {
    setForm(prev => {
      if (prev.challengeIds.includes(id)) {
        return { ...prev, challengeIds: prev.challengeIds.filter(c => c !== id) };
      }
      return { ...prev, challengeIds: [...prev.challengeIds, id] };
    });
  }

  function removeChallenge(id: string) {
    setForm(prev => ({ ...prev, challengeIds: prev.challengeIds.filter(c => c !== id) }));
  }

  // ── Drag handlers (HTML5 DnD on the ordered list) ─────────────────────────────

  function onDragStart(e: React.DragEvent, i: number) {
    dragIdx.current = i;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(i);
  }

  function onDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === i) { reset(); return; }
    setForm(prev => {
      const next = [...prev.challengeIds];
      const [moved] = next.splice(from, 1);
      next.splice(i, 0, moved);
      return { ...prev, challengeIds: next };
    });
    reset();
  }

  function onDragEnd() { reset(); }

  function reset() {
    dragIdx.current = null;
    setDragOver(null);
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Title is required.'); return; }
    setError('');
    onSave(form);
  }

  const isEditing       = Boolean(initial);
  const selectedChallenges = form.challengeIds
    .map(id => challenges.find(c => c.id === id))
    .filter((c): c is PickerChallenge => Boolean(c));

  const showThumbPreview = form.thumbnail && !imgError;

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>{isEditing ? 'Editing course' : 'New course'}</p>
            <h2 className={styles.modalTitle}>{isEditing ? 'Edit Course' : 'Create Course'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <IconX />
          </button>
        </div>

        {/* ── Body ── */}
        <form id="course-form" className={styles.modalBody} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.errorBanner}>{error}</p>}

          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="co-title">Title</label>
            <input
              id="co-title"
              type="text"
              className={styles.input}
              placeholder="e.g. Introduction to Algorithms"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="co-desc">Description</label>
            <textarea
              id="co-desc"
              className={styles.textarea}
              placeholder="Describe what students will learn in this course…"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
          </div>

          {/* Thumbnail URL */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="co-thumb">Thumbnail URL</label>
            <div className={styles.thumbnailRow}>
              <div className={styles.inputIconWrap}>
                <span className={styles.inputIcon}><IconImage /></span>
                <input
                  id="co-thumb"
                  type="url"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  placeholder="https://example.com/image.jpg"
                  value={form.thumbnail}
                  onChange={e => setForm(prev => ({ ...prev, thumbnail: e.target.value }))}
                />
              </div>

              <div className={styles.thumbnailPreviewBox}>
                {showThumbPreview ? (
                  <img
                    src={form.thumbnail}
                    alt="Preview"
                    className={styles.thumbnailPreviewImg}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className={styles.thumbnailPreviewPlaceholder}>
                    <IconImage />
                    <span>Preview</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Challenge picker ── */}
          <div className={styles.pickerSection}>
            <div className={styles.pickerHeader}>
              <span className={styles.label}>Challenges</span>
              <span className={styles.pickerCount}>
                {form.challengeIds.length} of {challenges.length} selected
              </span>
            </div>

            <div className={styles.pickerLayout}>

              {/* Left: checklist */}
              <div className={styles.checklist}>
                <p className={styles.pickerPanelLabel}>Available</p>
                {challengesLoading ? (
                  <p style={{ color: 'var(--text-muted, #888)', padding: '0.5rem 0' }}>Loading challenges…</p>
                ) : challenges.length === 0 ? (
                  <p style={{ color: 'var(--text-muted, #888)', padding: '0.5rem 0' }}>No challenges available.</p>
                ) : (
                  challenges.map(c => {
                    const checked = form.challengeIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`${styles.checkItem} ${checked ? styles.checkItemChecked : ''}`}
                      >
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={checked}
                          onChange={() => toggleChallenge(c.id)}
                        />
                        <span className={styles.checkItemText}>
                          <span className={styles.checkItemTitle}>{c.title}</span>
                          <span className={styles.checkItemMeta}>
                            <span className={`${styles.diffBadge} ${DIFF_CLASS[c.difficulty]}`}>
                              {c.difficulty}
                            </span>
                            <span className={styles.checkItemCategory}>{c.category}</span>
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Right: ordered + drag-to-reorder */}
              <div className={styles.orderedList}>
                <p className={styles.pickerPanelLabel}>
                  Selected order
                  {selectedChallenges.length > 1 && (
                    <span className={styles.dragHint}> · drag to reorder</span>
                  )}
                </p>

                {selectedChallenges.length === 0 ? (
                  <div className={styles.orderedEmpty}>
                    Check challenges on the left to add them here.
                  </div>
                ) : (
                  <div className={styles.draggableList}>
                    {selectedChallenges.map((c, i) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={e => onDragStart(e, i)}
                        onDragOver={e => onDragOver(e, i)}
                        onDrop={e => onDrop(e, i)}
                        onDragEnd={onDragEnd}
                        className={`${styles.draggableItem} ${dragOver === i ? styles.draggableItemOver : ''}`}
                      >
                        <span className={styles.dragHandle} title="Drag to reorder">
                          <IconGrip />
                        </span>

                        <span className={styles.orderNum}>{i + 1}</span>

                        <span className={styles.draggableTitle}>{c.title}</span>

                        <span className={`${styles.diffBadge} ${DIFF_CLASS[c.difficulty]}`}>
                          {c.difficulty}
                        </span>

                        <button
                          type="button"
                          className={styles.btnRemoveDraggable}
                          onClick={() => removeChallenge(c.id)}
                          aria-label={`Remove ${c.title}`}
                        >
                          <IconSmallX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* ── Footer ── */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button
            type="submit"
            form="course-form"
            className={styles.btnSave}
          >
            {isEditing ? 'Save Changes' : 'Create Course'}
          </button>
        </div>

      </div>
    </div>
  );
}
