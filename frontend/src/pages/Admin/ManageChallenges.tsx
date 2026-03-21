import { useState, useEffect } from 'react';
import styles from './ManageChallenges.module.css';
import ChallengeModal from './ChallengeModal';
import { mockChallenges } from '../../mock/data';
import { LS } from '../../constants/storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Category =
  | 'Arrays' | 'Strings' | 'Dynamic Programming' | 'Trees'
  | 'Graphs' | 'Math' | 'Hash Maps' | 'Sorting' | 'Binary Search'
  | 'Linked Lists' | 'Stack & Queue';
export type Language = 'javascript' | 'python' | 'cpp' | 'java';

export interface TestCase { id: string; input: string; output: string; }

export interface StarterCode {
  javascript: string;
  python: string;
  cpp: string;
  java: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: Category;
  starterCode: StarterCode;
  testCases: TestCase[];
}

// mockChallenges imported from ../../mock/data

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManageChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    try {
      const raw = localStorage.getItem(LS.A_CHALLENGES);
      if (raw) return JSON.parse(raw) as Challenge[];
    } catch { /* ignore */ }
    return mockChallenges;
  });
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Challenge | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(LS.A_CHALLENGES, JSON.stringify(challenges));
  }, [challenges]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(c: Challenge) {
    setEditing(c);
    setModalOpen(true);
  }

  function handleSave(data: Omit<Challenge, 'id'>) {
    if (editing) {
      setChallenges(prev =>
        prev.map(c => c.id === editing.id ? { ...data, id: c.id } : c)
      );
    } else {
      setChallenges(prev => [...prev, { ...data, id: generateId() }]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
    } catch { /* optimistic delete */ }
    setChallenges(prev => prev.filter(c => c.id !== id));
    setConfirmDeleteId(null);
  }

  const DIFF_CLASS: Record<Difficulty, string> = {
    Easy:   styles.badgeEasy,
    Medium: styles.badgeMedium,
    Hard:   styles.badgeHard,
  };

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Admin</p>
          <h1 className={styles.headerTitle}>Manage Challenges</h1>
          <p className={styles.headerSub}>{challenges.length} challenge{challenges.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnCreate} onClick={openCreate}>
          <IconPlus /> Create Challenge
        </button>
      </div>

      {/* ── Challenge list ── */}
      <div className={styles.list}>
        {challenges.length === 0 && (
          <div className={styles.empty}>No challenges yet. Create your first one.</div>
        )}

        {challenges.map(c => (
          <div key={c.id} className={styles.card}>
            <div className={styles.cardMain}>
              <div className={styles.cardTop}>
                <h3 className={styles.cardTitle}>{c.title}</h3>
                <div className={styles.cardBadges}>
                  <span className={`${styles.badge} ${DIFF_CLASS[c.difficulty]}`}>
                    {c.difficulty}
                  </span>
                  <span className={styles.categoryTag}>{c.category}</span>
                </div>
              </div>
              <p className={styles.cardDesc}>{c.description}</p>
              <p className={styles.cardMeta}>
                {c.testCases.length} test case{c.testCases.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className={styles.cardActions}>
              {confirmDeleteId === c.id ? (
                <div className={styles.confirmDelete}>
                  <span className={styles.confirmText}>Delete?</span>
                  <button className={styles.btnConfirm} onClick={() => handleDelete(c.id)}>Yes</button>
                  <button className={styles.btnCancelDel} onClick={() => setConfirmDeleteId(null)}>No</button>
                </div>
              ) : (
                <>
                  <button className={styles.btnEdit} onClick={() => openEdit(c)}>
                    <IconEdit /> Edit
                  </button>
                  <button className={styles.btnDelete} onClick={() => setConfirmDeleteId(c.id)}>
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
        <ChallengeModal
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
