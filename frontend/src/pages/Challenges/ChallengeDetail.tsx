import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CodeEditor from '../../components/UI/CodeEditor';
import { mockChallenges, mockSubmissions } from '../../mock/data';
import type { MockSubmission } from '../../mock/data';
import styles from './ChallengeDetail.module.css';
import { LS } from '../../constants/storage';

// ── Types ─────────────────────────────────────────────────────────
type Tab = 'problem' | 'examples' | 'submissions';
type SubmissionStatus = 'Accepted' | 'Wrong Answer' | 'TLE';

// ── Helper: render description with basic inline markdown ─────────
function renderDescription(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line
      .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
      .map((part, j) => {
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={j}>{part.slice(1, -1)}</code>;
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={j}>{part.slice(1, -1)}</em>;
        return part;
      });
    return (
      <p key={i}>
        {parts}
      </p>
    );
  });
}

// ── Submission status badge ───────────────────────────────────────
function StatusBadge({ status }: { status: MockSubmission['status'] }) {
  const cls =
    status === 'Accepted'
      ? styles.statusAccepted
      : status === 'Wrong Answer'
      ? styles.statusWrongAnswer
      : styles.statusTle;
  const dot = status === 'TLE' ? '◐' : '●';
  return (
    <span className={`${styles.statusBadge} ${cls}`}>
      {dot} {status}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────
export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();

  // Look up challenge from central mock data; fall back to first challenge
  const challenge = (id ? mockChallenges.find(c => c.id === id) : null) ?? mockChallenges[0];
  const submissions: MockSubmission[] = mockSubmissions[challenge.id] ?? [];

  const [activeTab, setActiveTab] = useState<Tab>('problem');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<
    { status: SubmissionStatus; runtime: string } | null
  >(null);

  // Mock submit — picks a random result for demo purposes
  const handleSubmit = () => {
    setSubmitting(true);
    setSubmitResult(null);
    setTimeout(() => {
      const outcomes: Array<{ status: SubmissionStatus; runtime: string }> = [
        { status: 'Accepted',     runtime: '52 ms' },
        { status: 'Wrong Answer', runtime: '—'     },
        { status: 'Accepted',     runtime: '61 ms' },
      ];
      setSubmitResult(outcomes[Math.floor(Math.random() * outcomes.length)]);
      setSubmitting(false);
    }, 1200);
  };

  const diffBadge =
    challenge.difficulty === 'Easy'
      ? styles.badgeEasy
      : challenge.difficulty === 'Medium'
      ? styles.badgeMedium
      : styles.badgeHard;

  // Get studentId from localStorage if available
  const storedUser = localStorage.getItem(LS.USER);
  const studentId = storedUser
    ? (JSON.parse(storedUser) as { name?: string }).name ?? 'student-001'
    : 'student-001';

  return (
    <div className={styles.page}>

      {/* ── Breadcrumb bar ── */}
      <div className={styles.topBar}>
        <Link to="/challenges" className={styles.backLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Challenges
        </Link>
        <span className={styles.breadSep}>/</span>
        <span className={styles.breadCurrent}>{challenge.title}</span>
      </div>

      {/* ── Two-column body ── */}
      <div className={styles.body}>

        {/* ════════════ LEFT PANEL ════════════ */}
        <div className={styles.leftPanel}>

          {/* Tab bar */}
          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${activeTab === 'problem' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('problem')}
            >
              Problem
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'examples' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('examples')}
            >
              Examples
              <span className={styles.tabBadge}>{challenge.examples.length}</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'submissions' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('submissions')}
            >
              Submissions
              {submissions.length > 0 && (
                <span className={styles.tabBadge}>{submissions.length}</span>
              )}
            </button>
          </div>

          {/* ── Tab content ── */}
          <div className={styles.leftScroll}>

            {/* PROBLEM TAB */}
            {activeTab === 'problem' && (
              <>
                <div className={styles.problemHeader}>
                  <h1 className={styles.problemTitle}>{challenge.title}</h1>
                  <div className={styles.problemMeta}>
                    <span className={`${styles.badge} ${diffBadge}`}>
                      {challenge.difficulty}
                    </span>
                    <span className={styles.categoryTag}>{challenge.category}</span>
                  </div>
                </div>

                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Description</p>
                  <div className={styles.sectionBody}>
                    {renderDescription(challenge.description)}
                  </div>
                </div>

                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Input Format</p>
                  <div className={styles.sectionBody}>
                    {renderDescription(challenge.inputFormat)}
                  </div>
                </div>

                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Output Format</p>
                  <div className={styles.sectionBody}>
                    {renderDescription(challenge.outputFormat)}
                  </div>
                </div>

                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Constraints</p>
                  <ul className={styles.constraintList}>
                    {challenge.constraints.map((c, i) => (
                      <li key={i} className={styles.constraintItem}>{c}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* EXAMPLES TAB */}
            {activeTab === 'examples' && (
              <div className={styles.exampleList}>
                {challenge.examples.map((ex, i) => (
                  <div key={i} className={styles.exampleCard}>
                    <div className={styles.exampleLabel}>Example {i + 1}</div>
                    <div className={styles.exampleBody}>
                      <div className={styles.ioRow}>
                        <span className={styles.ioLabel}>Input</span>
                        <pre className={styles.ioBlock}>{ex.input}</pre>
                      </div>
                      <div className={styles.ioRow}>
                        <span className={styles.ioLabel}>Output</span>
                        <pre className={styles.ioBlock}>{ex.output}</pre>
                      </div>
                      {ex.explanation && (
                        <p className={styles.exampleExplanation}>
                          <strong>Explanation: </strong>
                          {ex.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SUBMISSIONS TAB */}
            {activeTab === 'submissions' && (
              <div className={styles.submissionsWrap}>
                {submissions.length === 0 ? (
                  <p className={styles.submissionsEmpty}>
                    No submissions yet. Submit your first solution!
                  </p>
                ) : (
                  <table className={styles.submissionsTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Language</th>
                        <th>Status</th>
                        <th>Runtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => (
                        <tr key={sub.id}>
                          <td className={styles.tdDate}>{sub.date}</td>
                          <td className={styles.tdLang}>{sub.language}</td>
                          <td>
                            <StatusBadge status={sub.status} />
                          </td>
                          <td className={styles.tdRuntime}>{sub.runtime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ════════════ RIGHT PANEL ════════════ */}
        <div className={styles.rightPanel}>
          <div className={styles.editorWrap}>
            <CodeEditor examId={challenge.id} studentId={studentId} />
          </div>

          {/* Submit bar */}
          <div className={styles.submitBar}>
            <div>
              {submitResult && (
                <span
                  className={`${styles.submitResult} ${
                    submitResult.status === 'Accepted'
                      ? styles.submitResultAccepted
                      : styles.submitResultFailed
                  }`}
                >
                  {submitResult.status === 'Accepted' ? '✓' : '✗'}{' '}
                  {submitResult.status}
                  {submitResult.runtime !== '—' && (
                    <span className={styles.submitResultRuntime}>
                      {' '}· {submitResult.runtime}
                    </span>
                  )}
                </span>
              )}
            </div>
            <button
              className={styles.btnSubmit}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.spinning}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  Submit Solution
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
