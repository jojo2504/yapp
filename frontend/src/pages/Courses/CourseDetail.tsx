import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './CourseDetail.module.css';
import { LS } from '../../constants/storage';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  challengeIds: string[];
  groupIds: string[];
}

interface Challenge {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(LS.A_COURSES);
    if (raw) return JSON.parse(raw) as Course[];
  } catch { /* ignore */ }
  return [];
}

function loadChallenges(): Challenge[] {
  try {
    const raw = localStorage.getItem(LS.A_CHALLENGES);
    if (raw) return JSON.parse(raw) as Challenge[];
  } catch { /* ignore */ }
  return [];
}

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

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();

  const course = useMemo(() => loadCourses().find(c => c.id === id) ?? null, [id]);
  const allChallenges = useMemo(loadChallenges, []);

  const DIFF_CLASS: Record<string, string> = {
    Easy:   styles.badgeEasy,
    Medium: styles.badgeMedium,
    Hard:   styles.badgeHard,
  };

  if (!course) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/courses" className={styles.back}><IconChevronLeft /> Courses</Link>
          <p className={styles.notFound}>Course not found.</p>
        </div>
      </div>
    );
  }

  const courseMap = Object.fromEntries(allChallenges.map(c => [c.id, c]));
  const challenges = course.challengeIds.map(cid => courseMap[cid]).filter(Boolean) as Challenge[];

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        <Link to="/courses" className={styles.back}><IconChevronLeft /> Courses</Link>

        <div className={styles.header}>
          <div className={styles.thumbnail}>
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className={styles.thumbnailImg}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className={styles.thumbnailPlaceholder}><IconBook /></div>
            )}
          </div>

          <div className={styles.headerInfo}>
            <p className={styles.headerLabel}>Course</p>
            <h1 className={styles.headerTitle}>{course.title}</h1>
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
