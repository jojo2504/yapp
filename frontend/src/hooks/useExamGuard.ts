import { useState, useEffect, useRef, useCallback } from 'react';

const GRACE_SECONDS     = 3;
const MINOR_MAX_SECONDS = 10;

export interface ExamGuardOptions {
  /** Number of minor violations before the session is flagged. Default: 3 */
  maxViolations?: number;
  examId?: string;
  studentId?: string;
  /** Called immediately when a major violation (>10 s) is detected */
  onMajorViolation?: () => void;
}

export interface ExamGuardResult {
  violations: number;
  maxViolations: number;
  isFlagged: boolean;
  isAway: boolean;
  showWarning: boolean;
  isActive: boolean;
  dismissWarning: () => void;
  startExam: () => void;
  endExam: () => void;
}

// ── Server helpers ────────────────────────────────────────────────
async function logViolation(
  examId: string,
  studentId: string,
  duration: number,
  violationType: 'minor' | 'major',
) {
  try {
    await fetch('/api/exam/violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId,
        studentId,
        duration,
        timestamp: new Date().toISOString(),
        violationType,
      }),
    });
  } catch {
    // Network errors must not interrupt the exam
  }
}

async function submitZero(examId: string, studentId: string) {
  try {
    await fetch('/api/exam/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId,
        studentId,
        score: 0,
        reason: 'focus_violation',
      }),
    });
  } catch {
    // Network errors must not interrupt the exam
  }
}

// ── Hook ──────────────────────────────────────────────────────────
export function useExamGuard(options: ExamGuardOptions = {}): ExamGuardResult {
  const {
    maxViolations = 3,
    examId    = '',
    studentId = '',
    onMajorViolation,
  } = options;

  const [isActive, setIsActive]       = useState(false);
  const [violations, setViolations]   = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isFlagged, setIsFlagged]     = useState(false);
  const [isAway, setIsAway]           = useState(false);

  const isActiveRef    = useRef(false);
  const isAwayRef      = useRef(false);
  const violationsRef  = useRef(0);
  const leaveTimeRef   = useRef<number | null>(null);
  // Keep callback ref stable so event handlers never go stale
  const onMajorRef     = useRef(onMajorViolation);
  useEffect(() => { onMajorRef.current = onMajorViolation; }, [onMajorViolation]);

  // ── Leave handler ─────────────────────────────────────────────────
  // Only records the departure time; decision happens on return.
  const handleLeave = useCallback(() => {
    if (!isActiveRef.current || isAwayRef.current) return;
    isAwayRef.current  = true;
    leaveTimeRef.current = Date.now();
    setIsAway(true);
  }, []);

  // ── Return handler ────────────────────────────────────────────────
  const handleReturn = useCallback(() => {
    if (!isActiveRef.current || !isAwayRef.current) return;

    const duration =
      leaveTimeRef.current !== null
        ? (Date.now() - leaveTimeRef.current) / 1000
        : 0;

    isAwayRef.current  = false;
    leaveTimeRef.current = null;
    setIsAway(false);

    // Under grace period — ignore completely
    if (duration < GRACE_SECONDS) return;

    if (duration <= MINOR_MAX_SECONDS) {
      // Minor violation: log and show warning
      logViolation(examId, studentId, duration, 'minor');
      setViolations(prev => {
        const next = prev + 1;
        violationsRef.current = next;
        if (next >= maxViolations) setIsFlagged(true);
        return next;
      });
      setShowWarning(true);
    } else {
      // Major violation: log, submit zero, flag session, notify component
      logViolation(examId, studentId, duration, 'major');
      submitZero(examId, studentId);
      setViolations(prev => {
        const next = prev + 1;
        violationsRef.current = next;
        return next;
      });
      setIsFlagged(true);
      setShowWarning(true);
      onMajorRef.current?.();
    }
  }, [examId, studentId, maxViolations]);

  // ── Attach / detach listeners ─────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const onVisibilityChange = () => {
      if (document.hidden) handleLeave();
      else handleReturn();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur',  handleLeave);
    window.addEventListener('focus', handleReturn);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur',  handleLeave);
      window.removeEventListener('focus', handleReturn);
    };
  }, [isActive, handleLeave, handleReturn]);

  // ── Public API ────────────────────────────────────────────────────
  const startExam = useCallback(() => {
    isAwayRef.current     = false;
    isActiveRef.current   = true;
    violationsRef.current = 0;
    leaveTimeRef.current  = null;
    setViolations(0);
    setIsFlagged(false);
    setShowWarning(false);
    setIsAway(false);
    setIsActive(true);
  }, []);

  const endExam = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setShowWarning(false);
    setIsAway(false);
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return {
    violations,
    maxViolations,
    isFlagged,
    isAway,
    showWarning,
    isActive,
    dismissWarning,
    startExam,
    endExam,
  };
}
