import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ManageChallenges.module.css';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Category =
  | 'Arrays' | 'Strings' | 'Dynamic Programming' | 'Trees'
  | 'Graphs' | 'Math' | 'Hash Maps' | 'Sorting' | 'Binary Search'
  | 'Linked Lists' | 'Stack & Queue';
export type Language = 'javascript' | 'python' | 'cpp' | 'java';

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  python:     'Python',
  cpp:        'C++',
  java:       'Java',
};

export interface TestCase {
  id: string;
  title: string;
  hidden: boolean;
  validator: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: Category;
  language: Language;
  starterCode: string;
  testCases: TestCase[];
}

// ── API mapping ───────────────────────────────────────────────────────────────

interface ApiChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  language?: string;
  starter_code?: unknown;
  test_cases: unknown;
}

const STARTER_TEMPLATES: Record<Language, string> = {
  javascript: 'function solution(/* args */) {\n  // Your code here\n}\n',
  python:     'def solution():  # add your args\n    # Your code here\n    pass\n',
  cpp:        '#include <bits/stdc++.h>\nusing namespace std;\n\n// Define your function here — the validator calls it directly.\nint solution(/* args */) {\n    // Your code here\n    return 0;\n}\n',
  java:       'class Solution {\n    public static int solution(/* args */) {\n        // Your code here\n        return 0;\n    }\n}\n',
};

// Validator templates assume the student exposes a function `solution(...)`.
// The validator is concatenated with the student source (or paired as
// `Validator` class for Java) so it can call `solution(...)` directly.
const VALIDATOR_TEMPLATES: Record<Language, string> = {
  javascript:
    "// Calls the student's `solution` and checks the result.\nconst expected = /* TODO */ 0;\nconst got = solution(/* TODO: args */);\nif (got !== expected) {\n  console.error(`Expected ${expected}, got ${got}`);\n  process.exit(1);\n}\n",
  python:
    "# Calls the student's `solution` and checks the result.\nexpected = 0  # TODO\ngot = solution()  # TODO: args\nif got != expected:\n    print(f'Expected {expected!r}, got {got!r}')\n    exit(1)\n",
  cpp:
    '// Calls the student\'s `solution` (defined above) and checks the result.\nint main() {\n    auto expected = 0; // TODO\n    auto got = solution(/* TODO: args */);\n    if (got != expected) {\n        std::cerr << "Expected " << expected << ", got " << got << std::endl;\n        return 1;\n    }\n    return 0;\n}\n',
  java:
    '// Convention: the student\'s file is compiled as `class Solution`. This\n// validator is compiled as `public class Validator` and calls Solution.\npublic class Validator {\n    public static void main(String[] args) {\n        int expected = 0; // TODO\n        int got = Solution.solution(/* TODO: args */);\n        if (got != expected) {\n            System.err.println("Expected " + expected + ", got " + got);\n            System.exit(1);\n        }\n    }\n}\n',
};

export function starterTemplate(lang: Language): string {
  return STARTER_TEMPLATES[lang];
}

export function validatorTemplate(lang: Language): string {
  return VALIDATOR_TEMPLATES[lang];
}

function normalizeLanguage(raw: unknown): Language {
  if (raw === 'javascript' || raw === 'python' || raw === 'cpp' || raw === 'java') return raw;
  return 'python';
}

// ── Legacy-data adapters ─────────────────────────────────────────────────────
// Challenges created before the single-language migration stored starter code
// and validators as a map keyed by language (e.g. {"python": "...", "cpp": ...}).
// New rows store a plain string. These helpers accept either shape so old
// challenges keep rendering correctly until they're rewritten.

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw.trimStart().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* not JSON */ }
  return null;
}

export function resolveStarter(raw: unknown, lang: Language): string {
  if (typeof raw === 'string') {
    const obj = tryParseJsonObject(raw);
    if (obj && typeof obj[lang] === 'string') return obj[lang] as string;
    return raw;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj[lang] === 'string') return obj[lang] as string;
  }
  return starterTemplate(lang);
}

export function resolveValidator(rawValidator: unknown, rawValidators: unknown, lang: Language): string {
  // Preferred: new single-string field.
  if (typeof rawValidator === 'string' && rawValidator.length > 0) return rawValidator;
  // Legacy: per-language map stored under `validators`.
  if (rawValidators && typeof rawValidators === 'object') {
    const obj = rawValidators as Record<string, unknown>;
    if (typeof obj[lang] === 'string') return obj[lang] as string;
  }
  return validatorTemplate(lang);
}

function fromApi(raw: ApiChallenge): Challenge {
  const language = normalizeLanguage(raw.language);
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    description: raw.description ?? '',
    difficulty: (['Easy', 'Medium', 'Hard'].includes(raw.difficulty) ? raw.difficulty : 'Easy') as Difficulty,
    category: (raw.category ?? 'Arrays') as Category,
    language,
    starterCode: resolveStarter(raw.starter_code, language),
    testCases: Array.isArray(raw.test_cases)
      ? (raw.test_cases as Array<{
          id?: string;
          title?: string;
          hidden?: boolean;
          validator?: unknown;
          validators?: unknown;
        }>).map((tc, i) => ({
          id: tc.id ?? String(i),
          title: tc.title ?? `Test ${i + 1}`,
          hidden: tc.hidden ?? false,
          validator: resolveValidator(tc.validator, tc.validators, language),
        }))
      : [],
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

export default function ManageChallenges() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadChallenges() {
    setLoading(true);
    apiFetch<ApiChallenge[]>('/api/challenges')
      .then(data => setChallenges(data.map(fromApi)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadChallenges(); }, []);

  function openCreate() { navigate('/admin/challenges/new'); }
  function openEdit(c: Challenge) { navigate(`/admin/challenges/${c.id}/edit`); }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    try {
      await apiFetch(`/api/challenges/${id}`, { method: 'DELETE' });
      setChallenges(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete challenge.');
    }
  }

  const DIFF_CLASS: Record<Difficulty, string> = {
    Easy:   styles.badgeEasy,
    Medium: styles.badgeMedium,
    Hard:   styles.badgeHard,
  };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Admin</p>
          <h1 className={styles.headerTitle}>Manage Challenges</h1>
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
          <h1 className={styles.headerTitle}>Manage Challenges</h1>
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
                  <span className={styles.categoryTag}>{LANGUAGE_LABELS[c.language]}</span>
                </div>
              </div>
              <p className={styles.cardDesc}>{c.description}</p>
              <p className={styles.cardMeta}>
                {c.testCases.length} validator{c.testCases.length !== 1 ? 's' : ''}
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

    </div>
  );
}
