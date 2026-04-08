import { useState, useEffect } from 'react';
import styles from '../Admin/ManageChallenges.module.css';
import ChallengeModal from '../Admin/ChallengeModal';
import type { Challenge, StarterCode, TestCase } from '../Admin/ManageChallenges';
import { apiFetch } from '../../services/api';

// ── API mapping ───────────────────────────────────────────────────────────────

interface ApiChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  starter_code: unknown;
  test_cases: unknown;
}

const EMPTY_STARTER: StarterCode = {
  javascript: 'function solution() {\n  // Your code here\n}',
  python:     'def solution():\n    # Your code here\n    pass',
  cpp:        '#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solution() {\n    // Your code here\n}',
  java:       'class Solution {\n    public void solution() {\n        // Your code here\n    }\n}',
};

function fromApi(raw: ApiChallenge): Challenge {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    description: raw.description ?? '',
    difficulty: (['Easy', 'Medium', 'Hard'].includes(raw.difficulty) ? raw.difficulty : 'Easy') as Challenge['difficulty'],
    category: (raw.category ?? 'Arrays') as Challenge['category'],
    starterCode: (raw.starter_code as StarterCode) ?? EMPTY_STARTER,
    testCases: Array.isArray(raw.test_cases)
      ? (raw.test_cases as Array<{ id?: string; input: string; output: string; hidden?: boolean }>).map((tc, i) => ({
          id: tc.id ?? String(i),
          input: tc.input ?? '',
          output: tc.output ?? '',
          hidden: tc.hidden ?? false,
        }))
      : [],
  };
}

function toApi(c: Omit<Challenge, 'id'>): object {
  return {
    title: c.title,
    description: c.description,
    difficulty: c.difficulty,
    category: c.category,
    starter_code: c.starterCode,
    test_cases: c.testCases,
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeacherChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Challenge | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadChallenges() {
    setLoading(true);
    apiFetch<ApiChallenge[]>('/api/challenges')
      .then(data => setChallenges(data.map(fromApi)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadChallenges(); }, []);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(c: Challenge) { setEditing(c); setModalOpen(true); }

  async function handleSave(data: Omit<Challenge, 'id'>) {
    const currentEditing = editing;
    setModalOpen(false);
    setEditing(null);
    setError('');
    try {
      if (currentEditing) {
        const updated = await apiFetch<ApiChallenge>(`/api/challenges/${currentEditing.id}`, {
          method: 'PUT',
          body: JSON.stringify(toApi(data)),
        });
        setChallenges(prev => prev.map(c => c.id === currentEditing.id ? fromApi(updated) : c));
      } else {
        const created = await apiFetch<ApiChallenge>('/api/challenges', {
          method: 'POST',
          body: JSON.stringify(toApi(data)),
        });
        setChallenges(prev => [...prev, fromApi(created)]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save challenge.');
      loadChallenges();
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    try {
      await apiFetch(`/api/challenges/${id}`, { method: 'DELETE' });
      setChallenges(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete challenge.');
    }
  }

  const DIFF_CLASS: Record<Challenge['difficulty'], string> = {
    Easy:   styles.badgeEasy,
    Medium: styles.badgeMedium,
    Hard:   styles.badgeHard,
  };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Teacher</p>
          <h1 className={styles.headerTitle}>My Challenges</h1>
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
          <h1 className={styles.headerTitle}>My Challenges</h1>
          <p className={styles.headerSub}>{challenges.length} challenge{challenges.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnCreate} onClick={openCreate}>
          <IconPlus /> Create Challenge
        </button>
      </div>

      {error && <p style={{ color: 'var(--error, #f87171)', padding: '0 0 1rem' }}>{error}</p>}

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
