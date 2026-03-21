import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CodeEditor from '../../components/UI/CodeEditor';
import { LS } from '../../constants/storage';
import styles from './LessonPage.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  title: string;
  challengeIds: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadFromLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  return [];
}

const DIFF_CLASS: Record<string, string> = {
  Easy:   'badgeEasy',
  Medium: 'badgeMedium',
  Hard:   'badgeHard',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const { courseId, challengeId } = useParams<{ courseId: string; challengeId: string }>();
  const navigate = useNavigate();

  const course = useMemo(
    () => loadFromLS<Course>(LS.A_COURSES).find(c => c.id === courseId) ?? null,
    [courseId],
  );

  const challenge = useMemo(
    () => loadFromLS<Challenge>(LS.A_CHALLENGES).find(c => c.id === challengeId) ?? null,
    [challengeId],
  );

  if (!course || !challenge) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p className={styles.notFoundTitle}>Lesson not found.</p>
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
          <Link to={`/courses/${courseId}`} className={styles.breadcrumbLink}>{course.title}</Link>
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
        {challenge.testCases?.length > 0 && (
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
          ← Back to {course.title}
        </button>

      </div>
    </div>
  );
}
