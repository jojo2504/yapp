import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Courses.module.css';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiCourse {
  id: number;
  name: string;
  description: string;
  challenge_ids: number[];
  group_ids: number[];
}

interface Course {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  challengeIds: string[];
  groupIds: string[];
}

function fromApi(raw: ApiCourse): Course {
  return {
    id: String(raw.id),
    name: raw.name ?? '',
    description: raw.description ?? '',
    thumbnail: '',
    challengeIds: (raw.challenge_ids ?? []).map(String),
    groupIds: (raw.group_ids ?? []).map(String),
  };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBook() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
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

function IconUsers() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<ApiCourse[]>('/api/courses')
      .then(data => setCourses(data.map(fromApi)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        Loading courses…
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

        <div className={styles.header}>
          <div>
            <p className={styles.headerLabel}>Learning</p>
            <h1 className={styles.headerTitle}>Courses</h1>
            <p className={styles.headerSub}>Structured learning paths for every level</p>
          </div>
          <span className={styles.countChip}>{courses.length} course{courses.length !== 1 ? 's' : ''}</span>
        </div>

        <div className={styles.grid}>
          {courses.length === 0 && (
            <div className={styles.empty}>
              No courses are available yet.<br />
              Ask your instructor to publish a course.
            </div>
          )}

          {courses.map(course => (
            <Link key={course.id} to={`/courses/${course.id}`} className={styles.card}>
              <div className={styles.thumbnail}>
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.name}
                    className={styles.thumbnailImg}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder}>
                    <IconBook />
                  </div>
                )}
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{course.name}</h3>
                {course.description && (
                  <p className={styles.cardDesc}>{course.description}</p>
                )}
                <div className={styles.cardStats}>
                  <span className={styles.statPill}>
                    <IconBolt /> {course.challengeIds.length} challenge{course.challengeIds.length !== 1 ? 's' : ''}
                  </span>
                  <span className={styles.statPill}>
                    <IconUsers /> {course.groupIds.length} group{course.groupIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className={styles.cardCta}>View course <IconArrow /></span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
