import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import CodeEditor from '../../components/UI/CodeEditor';
import { apiFetch } from '../../services/api';
import { resolveStarter } from '../Admin/ManageChallenges';
import styles from './ChallengeDetail.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'problem' | 'examples' | 'submissions';

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

interface ApiTestCase {
  id?: string;
  title?: string;
  hidden?: boolean;
}

type EditorLang = 'javascript' | 'python' | 'cpp' | 'java';

function normalizeLanguage(raw: unknown): EditorLang {
  if (raw === 'javascript' || raw === 'python' || raw === 'cpp' || raw === 'java') return raw;
  return 'python';
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  testCases: ApiTestCase[];
  language: EditorLang;
  starterCode: string;
}

function fromApi(raw: ApiChallenge): Challenge {
  let testCases: ApiTestCase[] = [];
  if (Array.isArray(raw.test_cases)) {
    testCases = raw.test_cases as ApiTestCase[];
  }
  const language = normalizeLanguage(raw.language);
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    description: raw.description ?? '',
    difficulty: (['Easy', 'Medium', 'Hard'].includes(raw.difficulty) ? raw.difficulty : 'Easy') as Challenge['difficulty'],
    category: raw.category ?? '',
    testCases,
    language,
    starterCode: resolveStarter(raw.starter_code, language),
  };
}

// ── Challenge judge output types ───────────────────────────────────────────────

interface ChallengeTestCaseResult {
  title: string;
  output?: string | null;
  verdict: string;
  hidden: boolean;
  time_ms: number;
}

interface ChallengeJudgeOutput {
  test_cases: ChallengeTestCaseResult[];
  passed: number;
  total: number;
}

// ── Submission polling ────────────────────────────────────────────────────────

type SubmitPhase = 'idle' | 'pending' | 'done' | 'error';

interface SubmitState {
  phase: SubmitPhase;
  submissionId?: number;
  verdict?: string;
  results?: ChallengeJudgeOutput;
  /**
   * Top-level message returned by the judge (compile errors, internal
   * failures). Shown above the per-validator breakdown so the student sees
   * something even when no test cases were evaluated.
   */
  error?: string;
}

async function pollSubmission(id: number, timeoutMs = 30_000): Promise<{
  verdict: string;
  judge_output?: string;
  message?: string;
}> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 800));
    try {
      const sub = await apiFetch<{
        verdict: string;
        judge_output?: string;
        message?: string;
      }>(`/api/submissions/${id}`);
      if (sub.verdict !== 'Pending') return sub;
    } catch {
      // network blip — keep polling
    }
  }
  throw new Error('Judge did not respond within 30 seconds');
}

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
    return <p key={i}>{parts}</p>;
  });
}

const VERDICT_LABEL: Record<string, string> = {
  Accepted:          'Accepted',
  WrongAnswer:       'Wrong Answer',
  RuntimeError:      'Runtime Error',
  CompilationError:  'Compilation Error',
  TimeLimitExceeded: 'Time Limit Exceeded',
  MemoryLimitExceeded: 'Memory Limit Exceeded',
  InternalError:     'Internal Error',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('problem');

  // Current editor state (tracked via onStateChange callback). The language
  // is fixed by the challenge so we only track the source code.
  const currentCode = useRef<string>('');

  const [submitState, setSubmitState] = useState<SubmitState>({ phase: 'idle' });

  useEffect(() => {
    apiFetch<ApiChallenge>(`/api/challenges/${id}`)
      .then(data => {
        const ch = fromApi(data);
        setChallenge(ch);
        // Seed the source-code ref so a student who hits Submit before typing
        // anything still sends the starter code rather than an empty string.
        currentCode.current = ch.starterCode;
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!id || submitState.phase === 'pending') return;
    // Pull the student onto the Results tab right away so they can watch the
    // verdict come in instead of having to hunt for a "View Results" button.
    setActiveTab('submissions');
    setSubmitState({ phase: 'pending' });

    try {
      const res = await apiFetch<{ id: number }>(`/api/challenges/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          source_code: currentCode.current,
        }),
      });

      const judged = await pollSubmission(res.id);

      let results: ChallengeJudgeOutput | undefined;
      if (judged.judge_output) {
        try { results = JSON.parse(judged.judge_output); } catch { /* ignore */ }
      }

      setSubmitState({
        phase: 'done',
        submissionId: res.id,
        verdict: judged.verdict,
        results,
        error: judged.message ?? undefined,
      });
    } catch (e: unknown) {
      setSubmitState({
        phase: 'error',
        error: e instanceof Error ? e.message : 'Submission failed.',
      });
    }
  };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.topBar} style={{ padding: '1rem 1.5rem', color: 'var(--text-muted, #888)' }}>
        Loading…
      </div>
    </div>
  );

  if (error || !challenge) return (
    <div className={styles.page}>
      <div className={styles.topBar} style={{ padding: '1rem 1.5rem', color: 'var(--error, #f87171)' }}>
        {error || 'Challenge not found.'}
      </div>
    </div>
  );

  const diffBadge =
    challenge.difficulty === 'Easy'
      ? styles.badgeEasy
      : challenge.difficulty === 'Medium'
      ? styles.badgeMedium
      : styles.badgeHard;

  const visibleTestCases = challenge.testCases.filter(tc => !tc.hidden);
  const hiddenCount = challenge.testCases.filter(tc => tc.hidden).length;

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
              {visibleTestCases.length > 0 && (
                <span className={styles.tabBadge}>{visibleTestCases.length}</span>
              )}
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'submissions' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('submissions')}
            >
              Results
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

                {hiddenCount > 0 && (
                  <p className={styles.hiddenNote}>
                    + {hiddenCount} hidden validator{hiddenCount !== 1 ? 's' : ''} used during grading
                  </p>
                )}
              </>
            )}

            {/* EXAMPLES TAB → list of visible validator titles */}
            {activeTab === 'examples' && (
              <div className={styles.exampleList}>
                {visibleTestCases.length === 0 ? (
                  <p style={{ color: 'var(--text-muted, #888)', padding: '1rem 0' }}>
                    No public validators for this challenge.
                  </p>
                ) : (
                  visibleTestCases.map((tc, i) => (
                    <div key={tc.id ?? i} className={styles.exampleCard}>
                      <div className={styles.exampleLabel}>
                        {tc.title?.trim() ? tc.title : `Validator ${i + 1}`}
                      </div>
                    </div>
                  ))
                )}
                {hiddenCount > 0 && (
                  <p className={styles.hiddenNote}>
                    + {hiddenCount} hidden validator{hiddenCount !== 1 ? 's' : ''} used during grading
                  </p>
                )}
              </div>
            )}

            {/* RESULTS TAB */}
            {activeTab === 'submissions' && (
              <div className={styles.submissionsWrap}>
                {submitState.phase === 'idle' && (
                  <p className={styles.submissionsEmpty}>
                    Submit your solution to see results.
                  </p>
                )}

                {submitState.phase === 'pending' && (
                  <p className={styles.submissionsEmpty}>
                    Judging… please wait.
                  </p>
                )}

                {submitState.phase === 'error' && (
                  <p style={{ color: 'var(--error, #f87171)', padding: '1rem 0' }}>
                    {submitState.error}
                  </p>
                )}

                {submitState.phase === 'done' && (
                  <SubmitResults
                    verdict={submitState.verdict!}
                    results={submitState.results}
                    topLevelMessage={submitState.error}
                  />
                )}
              </div>
            )}

          </div>
        </div>

        {/* ════════════ RIGHT PANEL ════════════ */}
        <div className={styles.rightPanel}>
          <div className={styles.editorWrap}>
            <CodeEditor
              language={challenge.language}
              starterCode={challenge.starterCode}
              onStateChange={(_lang, code) => {
                currentCode.current = code;
              }}
            />
          </div>
          <div className={styles.submitBar}>
            <button
              className={`${styles.btnSubmit} ${submitState.phase === 'pending' ? styles.btnSubmitBusy : ''}`}
              onClick={handleSubmit}
              disabled={submitState.phase === 'pending'}
            >
              {submitState.phase === 'pending' ? 'Judging…' : 'Submit'}
            </button>
            {submitState.phase === 'done' && (
              <button className={styles.btnViewResults} onClick={() => setActiveTab('submissions')}>
                View Results
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// ── Submit results panel ──────────────────────────────────────────────────────

function SubmitResults({
  verdict,
  results,
  topLevelMessage,
}: {
  verdict: string;
  results?: ChallengeJudgeOutput;
  topLevelMessage?: string;
}) {
  const isAccepted = verdict === 'Accepted';
  const cases = results?.test_cases ?? [];

  return (
    <div className={styles.resultsWrap}>
      <div className={styles.resultSummary}>
        <span className={isAccepted ? styles.verdictOk : styles.verdictFail}>
          {VERDICT_LABEL[verdict] ?? verdict}
        </span>
        {results && (
          <span className={styles.resultScore}>
            {results.passed} / {results.total} validators passed
          </span>
        )}
      </div>

      {/* Top-level error from the judge — typically a compilation failure
          that prevented any validator from running. Shown before the per-case
          list so the student notices it immediately. */}
      {topLevelMessage && topLevelMessage.trim().length > 0 && (
        <div className={styles.testResult + ' ' + styles.testResultFail}>
          <div className={styles.testResultHeader}>
            <span className={styles.testResultIcon}>✗</span>
            <span className={styles.testResultLabel}>Judge output</span>
          </div>
          <div className={styles.testResultBody}>
            <pre className={`${styles.testResultPre} ${styles.testResultPreFail}`}>
              {topLevelMessage}
            </pre>
          </div>
        </div>
      )}

      {cases.length === 0 && !topLevelMessage && (
        <p style={{ color: 'var(--text-muted, #888)', padding: '0.75rem 0' }}>
          No per-validator breakdown was returned.
        </p>
      )}

      <div className={styles.testResultList}>
        {cases.map((tc, i) => {
          const pass = tc.verdict === 'Accepted';
          const label = tc.title?.trim()
            ? tc.title
            : `Validator ${i + 1}`;
          return (
            <div key={i} className={`${styles.testResult} ${pass ? styles.testResultPass : styles.testResultFail}`}>
              <div className={styles.testResultHeader}>
                <span className={styles.testResultIcon}>{pass ? '✓' : '✗'}</span>
                <span className={styles.testResultLabel}>
                  {label}{tc.hidden ? ' (hidden)' : ''}
                </span>
                <span className={styles.testResultVerdict}>
                  {VERDICT_LABEL[tc.verdict] ?? tc.verdict}
                </span>
                <span className={styles.testResultTime}>{tc.time_ms}ms</span>
              </div>

              {!tc.hidden && tc.output && tc.output.trim().length > 0 && (
                <div className={styles.testResultBody}>
                  <div className={styles.testResultRow}>
                    <span className={styles.testResultRowLabel}>Output</span>
                    <pre className={`${styles.testResultPre} ${pass ? styles.testResultPreOk : styles.testResultPreFail}`}>
                      {tc.output}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
