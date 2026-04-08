import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './CourseDetail.module.css';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiCourse {
  id: number;
  name: string;
  description: string;
  challenge_ids: number[];
  group_ids: number[];
}

interface ApiChallenge {
  id: number;
  title: string;
  difficulty: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  challengeIds: string[];
}

interface Challenge {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBook() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();

  const [course, setCourse]         = useState<Course | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<ApiCourse>(`/api/courses/${id}`),
      apiFetch<ApiChallenge[]>('/api/challenges'),
    ])
      .then(([found, challengesData]) => {
        const mapped: Course = {
          id: String(found.id),
          name: found.name ?? '',
          description: found.description ?? '',
          thumbnail: '',
          challengeIds: (found.challenge_ids ?? []).map(String),
        };
        setCourse(mapped);

        const ordered = mapped.challengeIds
          .map(cid => {
            const raw = challengesData.find(c => String(c.id) === cid);
            if (!raw) return null;
            return {
              id: String(raw.id),
              title: raw.title ?? '',
              difficulty: (['Easy', 'Medium', 'Hard'].includes(raw.difficulty) ? raw.difficulty : 'Easy') as Challenge['difficulty'],
            };
          })
          .filter((c): c is Challenge => c !== null);
        setChallenges(ordered);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const DIFF_CLASS: Record<string, string> = {
    Easy:   styles.badgeEasy,
    Medium: styles.badgeMedium,
    Hard:   styles.badgeHard,
  };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/courses" className={styles.back}><IconChevronLeft /> Courses</Link>
        <p style={{ color: 'var(--text-muted, #888)', padding: '1rem 0' }}>Loading…</p>
      </div>
    </div>
  );

  if (error || !course) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/courses" className={styles.back}><IconChevronLeft /> Courses</Link>
        <p className={styles.notFound}>{error || 'Course not found.'}</p>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        <Link to="/courses" className={styles.back}><IconChevronLeft /> Courses</Link>

        <div className={styles.header}>
          <div className={styles.thumbnail}>
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.name}
                className={styles.thumbnailImg}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className={styles.thumbnailPlaceholder}><IconBook /></div>
            )}
          </div>

          <div className={styles.headerInfo}>
            <p className={styles.headerLabel}>Course</p>
            <h1 className={styles.headerTitle}>{course.name}</h1>
            {course.description && (
              <p className={styles.headerDesc}>{course.description}</p>
            )}
            <div className={styles.headerStats}>
              <span className={styles.statPill}>
                <IconBolt /> {course.challengeIds.length} challenge{course.challengeIds.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Challenges</h2>
          {challenges.length === 0 ? (
            <p className={styles.empty}>No challenges assigned to this course yet.</p>
          ) : (
            <div className={styles.challengeList}>
              {challenges.map((ch, i) => (
                <Link key={ch.id} to={`/courses/${id}/lesson/${ch.id}`} className={styles.challengeItem}>
                  <span className={styles.challengeNum}>{i + 1}.</span>
                  <span className={styles.challengeTitle}>{ch.title}</span>
                  <span className={`${styles.challengeBadge} ${DIFF_CLASS[ch.difficulty] ?? ''}`}>
                    {ch.difficulty}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
