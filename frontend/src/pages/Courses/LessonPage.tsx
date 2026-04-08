import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CodeEditor from '../../components/UI/CodeEditor';
import styles from './LessonPage.module.css';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  test_cases: unknown;
}

interface ApiCourse {
  id: number;
  name: string;
  challenge_ids: number[];
}

interface TestCase {
  id: string;
  input: string;
  output: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  testCases: TestCase[];
}

interface Course {
  id: string;
  name: string;
  challengeIds: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIFF_CLASS: Record<string, string> = {
  Easy:   'badgeEasy',
  Medium: 'badgeMedium',
  Hard:   'badgeHard',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const { courseId, challengeId } = useParams<{ courseId: string; challengeId: string }>();
  const navigate = useNavigate();

  const [course, setCourse]       = useState<Course | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<ApiCourse>(`/api/courses/${courseId}`),
      apiFetch<ApiChallenge>(`/api/challenges/${challengeId}`),
    ])
      .then(([foundCourse, foundChallenge]) => {
        setCourse({
          id: String(foundCourse.id),
          name: foundCourse.name ?? '',
          challengeIds: (foundCourse.challenge_ids ?? []).map(String),
        });

        setChallenge({
          id: String(foundChallenge.id),
          title: foundChallenge.title ?? '',
          description: foundChallenge.description ?? '',
          difficulty: (['Easy', 'Medium', 'Hard'].includes(foundChallenge.difficulty)
            ? foundChallenge.difficulty : 'Easy') as Challenge['difficulty'],
          category: foundChallenge.category ?? '',
          testCases: Array.isArray(foundChallenge.test_cases)
            ? (foundChallenge.test_cases as TestCase[])
            : [],
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId, challengeId]);

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <p style={{ color: 'var(--text-muted, #888)', padding: '1rem 0' }}>Loading…</p>
      </div>
    </div>
  );

  if (error || !course || !challenge) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p className={styles.notFoundTitle}>{error || 'Lesson not found.'}</p>
          <Link to="/courses" className={styles.backLink}>← Back to Courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/courses" className={styles.breadcrumbLink}>Courses</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <Link to={`/courses/${courseId}`} className={styles.breadcrumbLink}>{course.name}</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>{challenge.title}</span>
        </nav>

        {/* Title + difficulty badge */}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{challenge.title}</h1>
          <span className={`${styles.badge} ${styles[DIFF_CLASS[challenge.difficulty] ?? '']}`}>
            {challenge.difficulty}
          </span>
        </div>

        {/* Problem */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Problem</h2>
          <p className={styles.description}>{challenge.description}</p>
        </section>

        {/* Examples */}
        {challenge.testCases.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Examples</h2>
            <div className={styles.exampleList}>
              {challenge.testCases.map((tc, i) => (
                <div key={tc.id} className={styles.exampleBlock}>
                  <p className={styles.exampleLabel}>Example {i + 1}</p>
                  <pre className={styles.examplePre}>
                    <code>{`Input:  ${tc.input}\nOutput: ${tc.output}`}</code>
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Code editor */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Solution</h2>
          <div className={styles.editorWrapper}>
            <CodeEditor examId={challenge.id} studentId="student" />
          </div>
        </section>

        {/* Back button */}
        <button
          className={styles.backBtn}
          onClick={() => navigate(`/courses/${courseId}`)}
        >
          ← Back to {course.name}
        </button>

      </div>
    </div>
  );
}
