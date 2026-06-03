import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../services/api';

// How long before an exam's start time the student is forced into the exam page.
const LEAD_MS = 20 * 60 * 1000; // 20 minutes
const POLL_MS = 30 * 1000;      // refresh the schedule every 30s
const TICK_MS = 5 * 1000;       // re-check the time boundary every 5s

interface ApiExam {
  id: number;
  start_datetime: string;
  end_datetime: string;
  status_override?: string;
}

/**
 * localStorage flag marking that the current user finished a given exam *for a
 * given start time*. Keying by start time means an admin "Restart" (which moves
 * the start) produces a fresh key, so the student is pulled back in.
 */
export function examDoneKey(id: string | number, startIso: string): string {
  const v = new Date(startIso).getTime() || 0;
  return `exam_done_${id}_${v}`;
}

export function markExamDone(id: string | number, startIso: string): void {
  localStorage.setItem(examDoneKey(id, startIso), '1');
}

function isExamDone(ex: ApiExam): boolean {
  return localStorage.getItem(examDoneKey(ex.id, ex.start_datetime)) === '1';
}

/**
 * Mounted for every authenticated user. Polls the user's scheduled exams and,
 * from 20 minutes before an exam's start until its end, forces them onto the
 * exam page — redirecting back if they try to navigate away.
 */
export default function ExamScheduleWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const examsRef = useRef<ApiExam[]>([]);
  const [forcedExamId, setForcedExamId] = useState<string | null>(null);

  // Determine which exam (if any) should currently lock the user in.
  const evaluate = useCallback(() => {
    const now = Date.now();
    const active = examsRef.current.find(ex => {
      if (ex.status_override === 'stopped') return false;
      if (isExamDone(ex)) return false;
      if (ex.status_override === 'active') return true;
      const start = new Date(ex.start_datetime).getTime();
      const end   = new Date(ex.end_datetime).getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) return false;
      return now >= start - LEAD_MS && now <= end;
    });
    setForcedExamId(active ? String(active.id) : null);
  }, []);

  // Poll the schedule.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await apiFetch<ApiExam[]>('/api/exams/upcoming');
        if (!cancelled) examsRef.current = data ?? [];
      } catch {
        // Ignore — keep the last known schedule.
      }
      if (!cancelled) evaluate();
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [evaluate]);

  // Re-evaluate on navigation and on a short tick so the 20-minute boundary
  // triggers even between polls.
  useEffect(() => {
    evaluate();
    const id = setInterval(evaluate, TICK_MS);
    return () => clearInterval(id);
  }, [evaluate, location.pathname]);

  // Lock: redirect back to the exam page whenever the user strays from it.
  useEffect(() => {
    if (!forcedExamId) return;
    const target = `/exam/${forcedExamId}`;
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [forcedExamId, location.pathname, navigate]);

  // Warn before closing/reloading the tab during a forced exam.
  useEffect(() => {
    if (!forcedExamId) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [forcedExamId]);

  return null;
}
