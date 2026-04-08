import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import styles from './Challenges.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Category =
  | 'Arrays' | 'Strings' | 'Dynamic Programming' | 'Trees'
  | 'Graphs' | 'Math' | 'Hash Maps' | 'Sorting' | 'Binary Search'
  | 'Linked Lists' | 'Stack & Queue';

interface ApiChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: string;
}

function fromApi(raw: ApiChallenge): Challenge {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    description: raw.description ?? '',
    difficulty: (['Easy', 'Medium', 'Hard'].includes(raw.difficulty) ? raw.difficulty : 'Easy') as Difficulty,
    category: raw.category ?? '',
  };
}

const DIFFICULTY_FILTERS: Array<'All' | Difficulty> = ['All', 'Easy', 'Medium', 'Hard'];
const CATEGORY_FILTERS: Array<'All' | Category> = [
  'All', 'Arrays', 'Strings', 'Dynamic Programming', 'Trees',
  'Graphs', 'Math', 'Hash Maps', 'Sorting', 'Binary Search',
  'Linked Lists', 'Stack & Queue',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function difficultyPillClass(
  diff: 'All' | Difficulty,
  active: boolean,
  base: string,
) {
  if (!active) return base;
  if (diff === 'Easy') return `${base} ${styles.pillEasyActive}`;
  if (diff === 'Medium') return `${base} ${styles.pillMediumActive}`;
  if (diff === 'Hard') return `${base} ${styles.pillHardActive}`;
  return `${base} ${styles.pillActive}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<'All' | Difficulty>('All');
  const [category, setCategory] = useState<'All' | Category>('All');

  useEffect(() => {
    apiFetch<ApiChallenge[]>('/api/challenges')
      .then(data => setChallenges(data.map(fromApi)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase().trim());
      const matchDiff = difficulty === 'All' || c.difficulty === difficulty;
      const matchCat = category === 'All' || c.category === category;
      return matchSearch && matchDiff && matchCat;
    });
  }, [challenges, search, difficulty, category]);

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        Loading challenges…
      </div>
    </div>
  );

  if (error) return (
    <div className={styles.page}>
      <div className={styles.container} style={{ padding: '2rem', color: 'var(--error, #f87171)' }}>
        Error: {error}
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <p className={styles.headerLabel}>Practice</p>
            <h1 className={styles.headerTitle}>Challenges</h1>
            <p className={styles.headerSub}>
              Sharpen your skills with curated coding problems
            </p>
          </div>
          <span className={styles.countChip}>
            {challenges.length} challenges
          </span>
        </div>

        {/* ── Controls ── */}
        <div className={styles.controls}>

          {/* Search */}
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search challenges…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Difficulty filter */}
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Difficulty</span>
            <div className={styles.filterPills}>
              {DIFFICULTY_FILTERS.map((d) => {
                const active = difficulty === d;
                const cls = difficultyPillClass(d, active, styles.pill);
                return (
                  <button key={d} className={cls} onClick={() => setDifficulty(d)}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category filter */}
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Category</span>
            <div className={styles.filterPills}>
              {CATEGORY_FILTERS.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    className={`${styles.pill}${active ? ' ' + styles.pillActive : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Results bar ── */}
        <div className={styles.resultsBar}>
          <p className={styles.resultsCount}>
            Showing <strong>{filtered.length}</strong> of{' '}
            <strong>{challenges.length}</strong> challenges
          </p>
        </div>

        {/* ── Grid ── */}
        <div className={styles.grid}>
          {filtered.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>

      </div>
    </div>
  );
}

// ── Challenge card ───────────────────────────────────────────────────────────

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const cardVariant =
    challenge.difficulty === 'Easy'
      ? styles.cardEasy
      : challenge.difficulty === 'Medium'
      ? styles.cardMedium
      : styles.cardHard;

  const badgeVariant =
    challenge.difficulty === 'Easy'
      ? styles.badgeEasy
      : challenge.difficulty === 'Medium'
      ? styles.badgeMedium
      : styles.badgeHard;

  return (
    <div className={`${styles.card} ${cardVariant}`}>
      <div className={styles.cardTop}>
        <h3 className={styles.cardTitle}>{challenge.title}</h3>
        <span className={`${styles.badge} ${badgeVariant}`}>
          {challenge.difficulty}
        </span>
      </div>

      <p className={styles.cardDesc}>{challenge.description}</p>

      <div className={styles.cardFooter}>
        <span className={styles.categoryTag}>{challenge.category}</span>
        <Link to={`/challenges/${challenge.id}`} className={styles.btnSolve}>
          Solve
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
