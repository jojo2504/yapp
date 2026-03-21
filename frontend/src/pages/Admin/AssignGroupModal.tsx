import { useState, useEffect, useCallback } from 'react';
import type { Course, MockGroup } from './ManageCourses';
import styles from './AssignGroupModal.module.css';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  course: Course;
  groups: MockGroup[];
  onClose: () => void;
  onConfirm: (groupIds: string[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssignGroupModal({ course, groups, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string[]>([...course.groupIds]);
  const [loading, setLoading]   = useState(false);

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

  function toggle(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await fetch(`/api/courses/${course.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: selected }),
      });
    } catch { /* optimistic */ } finally {
      setLoading(false);
      onConfirm(selected);
    }
  }

  const unchanged =
    selected.length === course.groupIds.length &&
    selected.every(id => course.groupIds.includes(id));

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>Course assignment</p>
            <h2 className={styles.modalTitle}>Assign to Groups</h2>
            <p className={styles.modalSub} title={course.title}>{course.title}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <IconX />
          </button>
        </div>

        {/* ── Body ── */}
        <div className={styles.modalBody}>
          {groups.length === 0 ? (
            <p className={styles.emptyState}>No groups exist yet. Create a group first.</p>
          ) : (
            <>
              <p className={styles.instructions}>
                Select the groups that should have access to this course.
                {selected.length > 0 && (
                  <span className={styles.selectedCount}> {selected.length} selected</span>
                )}
              </p>

              <div className={styles.checklist}>
                {groups.map(group => {
                  const checked = selected.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`${styles.checkItem} ${checked ? styles.checkItemChecked : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={checked}
                        onChange={() => toggle(group.id)}
                      />
                      <span className={styles.checkIcon}>
                        <IconUsers />
                      </span>
                      <span className={styles.checkItemName}>{group.name}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnConfirm}
            onClick={handleConfirm}
            disabled={loading || unchanged}
          >
            {loading ? 'Saving…' : 'Confirm Assignment'}
          </button>
        </div>

      </div>
    </div>
  );
}
