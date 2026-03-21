import { useState, useEffect, useMemo } from 'react';
import { useExamGuard } from '../../hooks/useExamGuard';
import CodeEditor from './CodeEditor';
import styles from './ExamGuard.module.css';

// ── Exam data (populated from API) ────────────────────────────────
interface ExamQuestion {
  id: number;
  text: string;
  options: readonly string[];
}

const FALLBACK_QUESTIONS: ExamQuestion[] = [
  {
    id: 1,
    text: 'What is the time complexity of binary search on a sorted array of n elements?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
  },
  {
    id: 2,
    text: 'Which data structure operates on a LIFO (Last In, First Out) principle?',
    options: ['Queue', 'Stack', 'Linked List', 'Heap'],
  },
  {
    id: 3,
    text: 'What is the worst-case time complexity of quicksort?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
  },
  {
    id: 4,
    text: 'Which keyword is used to declare a constant in JavaScript?',
    options: ['var', 'let', 'const', 'static'],
  },
  {
    id: 5,
    text: 'What does typeof null return in JavaScript?',
    options: ['"null"', '"undefined"', '"object"', '"boolean"'],
  },
];

const EXAM_DURATION_SECONDS = 30 * 60; // 30 minutes

// ── Helpers ───────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type ExamPhase = 'idle' | 'active' | 'completed';

// ── Component ─────────────────────────────────────────────────────
export default function ExamGuard({ examId }: { examId?: string } = {}) {
  const questions = useMemo<ExamQuestion[]>(() => {
    if (!examId) return FALLBACK_QUESTIONS;
    try {
      const exams = JSON.parse(localStorage.getItem('a_exams') || '[]');
      const exam = exams.find((e: any) => e.id === examId);
      return exam?.questions?.length ? exam.questions : FALLBACK_QUESTIONS;
    } catch {
      return FALLBACK_QUESTIONS;
    }
  }, [examId]);

  const guard = useExamGuard({
    maxViolations: 3,
    examId: 'demo-exam',
    studentId: 'demo-student',
    onMajorViolation: () => handleSubmit(),
  });

  const [phase, setPhase]           = useState<ExamPhase>('idle');
  const [currentQ, setCurrentQ]     = useState(0);
  const [answers, setAnswers]       = useState<Record<number, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_DURATION_SECONDS);

  // ── Countdown timer ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;

    const id = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(id);
  }, [phase]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (phase === 'active' && secondsLeft === 0) {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  // ── Actions ──────────────────────────────────────────────────────
  const handleStart = () => {
    setCurrentQ(0);
    setAnswers({});
    setSecondsLeft(EXAM_DURATION_SECONDS);
    guard.startExam();
    setPhase('active');
  };

  const handleSubmit = () => {
    guard.endExam();
    setPhase('completed');
  };

  const handleRetry = () => {
    setPhase('idle');
  };

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  // ── Derived ──────────────────────────────────────────────────────
  const timerClass =
    secondsLeft < 60  ? styles.timerCritical :
    secondsLeft < 300 ? styles.timerWarning  : '';

  const violationClass =
    guard.violations === 0                       ? styles.violationSafe   :
    guard.violations < guard.maxViolations - 1   ? styles.violationMid   :
                                                   styles.violationDanger;

  const warningCountClass =
    guard.violations >= guard.maxViolations - 1
      ? styles.warningCountDanger
      : styles.warningCountSafe;

  const q = questions[currentQ];
  const isLastQuestion = currentQ === questions.length - 1;
  const answeredCount  = Object.keys(answers).length;

  // ── Render: idle ─────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className={styles.page}>
        <div className={styles.startScreen}>
          <div className={styles.startCard}>
            <p className={styles.startMeta}>
              <span>⚡</span> Exam Session
            </p>
            <h1 className={styles.startTitle}>Exam</h1>
            <p className={styles.startSubtitle}>
              A timed session with {questions.length} question{questions.length !== 1 ? 's' : ''}.
              Your focus is monitored throughout.
            </p>

            <div className={styles.startStats}>
              <span className={styles.statChip}>
                <span className={styles.statChipIcon}>⏱</span>
                {Math.floor(EXAM_DURATION_SECONDS / 60)} minutes
              </span>
              <span className={styles.statChip}>
                <span className={styles.statChipIcon}>📝</span>
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </span>
              <span className={styles.statChip}>
                <span className={styles.statChipIcon}>⚠️</span>
                3 tab-switch limit
              </span>
            </div>

            <div className={styles.startRules}>
              <p className={styles.startRulesTitle}>Before you begin</p>
              <ul className={styles.startRulesList}>
                <li>Do not switch browser tabs or windows during the exam.</li>
                <li>Do not minimize or leave the exam window.</li>
                <li>
                  Brief absences under <strong>3 seconds</strong> are ignored.
                </li>
                <li>
                  Absences of <strong>3–10 seconds</strong> are recorded as a
                  minor violation. After <strong>3 minor violations</strong> your
                  session is flagged for review.
                </li>
                <li>
                  Absences over <strong>10 seconds</strong> are a major violation
                  and will <strong>immediately submit your exam with a score of
                  0</strong>.
                </li>
                <li>All violations are logged with a timestamp and duration.</li>
              </ul>
            </div>

            <button className={styles.btnStart} onClick={handleStart}>
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: completed ────────────────────────────────────────────
  if (phase === 'completed') {
    const timeSpent = EXAM_DURATION_SECONDS - secondsLeft;
    const minutes   = Math.floor(timeSpent / 60);
    const seconds   = timeSpent % 60;

    return (
      <div className={styles.page}>
        <div className={styles.completedScreen}>
          <div className={styles.completedCard}>
            <div className={styles.completedIcon}>
              {guard.isFlagged ? '🚨' : '✅'}
            </div>
            <h2 className={styles.completedTitle}>
              {guard.isFlagged ? 'Session Flagged' : 'Exam Submitted'}
            </h2>
            <p className={styles.completedBody}>
              {guard.isFlagged
                ? 'Your session was flagged due to repeated tab switching. Your instructor has been notified.'
                : 'Your answers have been submitted. Your instructor will review them shortly.'}
            </p>

            <div className={styles.completedStats}>
              <div className={styles.completedStat}>
                <div className={styles.completedStatValue}>{answeredCount}/{questions.length}</div>
                <div className={styles.completedStatLabel}>Answered</div>
              </div>
              <div className={styles.completedStat}>
                <div className={styles.completedStatValue}>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className={styles.completedStatLabel}>Time Spent</div>
              </div>
              <div className={styles.completedStat}>
                <div className={styles.completedStatValue}>{guard.violations}</div>
                <div className={styles.completedStatLabel}>Violations</div>
              </div>
            </div>

            {guard.isFlagged && (
              <div className={styles.flaggedNote}>
                <span>🚨</span>
                Flagged for suspicious activity
              </div>
            )}

            <button className={styles.btnRetry} onClick={handleRetry}>
              Try Demo Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: active exam ──────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.startScreen}>
          <div className={styles.startCard}>
            <p className={styles.startMeta}>No questions available for this exam.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.examLayout}>

        {/* Header */}
        <div className={styles.examHeader}>
          <span className={styles.examTitle}>Exam</span>
          <div className={styles.examHeaderRight}>
            <span className={`${styles.timer} ${timerClass}`}>
              <span className={styles.timerIcon}>⏱</span>
              {formatTime(secondsLeft)}
            </span>
            <span className={`${styles.violationBadge} ${violationClass}`}>
              ⚠ {guard.violations} / {guard.maxViolations} violations
            </span>
          </div>
        </div>

        {/* Split body: question left, code editor right */}
        <div className={styles.examSplit}>

          {/* Left — MCQ question */}
          <div className={styles.examLeft}>
            <div className={styles.questionCard}>
              <p className={styles.questionMeta}>
                Question {currentQ + 1} of {questions.length}
              </p>
              <p className={styles.questionText}>{q.text}</p>

              <div className={styles.options}>
                {q.options.map((option, i) => {
                  const selected = answers[currentQ] === i;
                  return (
                    <label
                      key={i}
                      className={`${styles.optionLabel} ${selected ? styles.optionSelected : ''}`}
                      onClick={() => selectAnswer(currentQ, i)}
                    >
                      <input type="radio" name={`q${currentQ}`} readOnly checked={selected} />
                      <span className={styles.optionRadio}>
                        <span className={styles.optionRadioFill} />
                      </span>
                      {option}
                    </label>
                  );
                })}
              </div>

              <div className={styles.questionNav}>
                <div className={styles.questionDots}>
                  {questions.map((_, i) => (
                    <span
                      key={i}
                      className={[
                        styles.dot,
                        i === currentQ           ? styles.dotCurrent  : '',
                        answers[i] !== undefined ? styles.dotAnswered : '',
                      ].filter(Boolean).join(' ')}
                    />
                  ))}
                </div>

                <div className={styles.navButtons}>
                  <button
                    className={styles.btnNav}
                    onClick={() => setCurrentQ(q => q - 1)}
                    disabled={currentQ === 0}
                  >
                    ← Prev
                  </button>
                  {isLastQuestion ? (
                    <button className={styles.btnSubmit} onClick={handleSubmit}>
                      Submit Exam
                    </button>
                  ) : (
                    <button
                      className={styles.btnNav}
                      onClick={() => setCurrentQ(q => q + 1)}
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right — code editor */}
          <div className={styles.examRight}>
            <CodeEditor examId="demo-exam" studentId="demo-student" />
          </div>

        </div>
      </div>

      {/* Warning overlay — user returned after a tab switch */}
      {guard.showWarning && !guard.isFlagged && (
        <div className={`${styles.overlay} ${styles.overlayWarning}`}>
          <div className={`${styles.overlayCard} ${styles.warningCard}`}>
            <div className={styles.warningIconWrap}>⚠️</div>
            <h2 className={styles.warningTitle}>Tab Switch Detected</h2>
            <p className={styles.warningBody}>
              You left the exam window. This has been recorded.
            </p>
            <p className={`${styles.warningCount} ${warningCountClass}`}>
              Violation {guard.violations} of {guard.maxViolations} —{' '}
              {guard.maxViolations - guard.violations} remaining before your session is flagged.
            </p>
            <button className={styles.btnDismiss} onClick={guard.dismissWarning}>
              I understand — return to exam
            </button>
          </div>
        </div>
      )}

      {/* Flagged overlay — max violations reached */}
      {guard.isFlagged && (
        <div className={`${styles.overlay} ${styles.overlayFlagged}`}>
          <div className={`${styles.overlayCard} ${styles.flaggedCard}`}>
            <div className={styles.flaggedIconWrap}>🚨</div>
            <h2 className={styles.flaggedTitle}>Exam Session Flagged</h2>
            <p className={styles.flaggedBody}>
              You left the exam window {guard.violations} times. Your session has been
              automatically flagged as suspicious. Your instructor will be notified.
              You may still submit your current answers.
            </p>
            <button className={styles.btnEndExam} onClick={handleSubmit}>
              Submit &amp; End Exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
