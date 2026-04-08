import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AdminDashboard.module.css';
import { LS } from '../../constants/storage';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiStats {
  challenges: number;
  courses: number;
  exams: number;
  groups: number;
}

// ── Quick access config ────────────────────────────────────────────────────────

const QUICK_ACCESS = [
  {
    to: '/admin/challenges',
    label: 'Manage Challenges',
    desc: 'Add, edit, or remove coding challenges and review submissions.',
    icon: <IconBolt />,
    accent: 'purple',
    cta: 'Go to challenges',
  },
  {
    to: '/admin/courses',
    label: 'Manage Courses',
    desc: 'Create course modules, upload lessons, and manage enrolments.',
    icon: <IconBook />,
    accent: 'blue',
    cta: 'Go to courses',
  },
  {
    to: '/admin/exams',
    label: 'Manage Exams',
    desc: 'Schedule exam sessions, set time limits, and view results.',
    icon: <IconClip />,
    accent: 'green',
    cta: 'Go to exams',
  },
] as const;

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconClip() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUser() {
  try {
    const raw = localStorage.getItem(LS.USER);
    if (raw) return JSON.parse(raw) as { name: string; role: string };
  } catch { /* ignore */ }
  return { name: 'Admin', role: 'admin' };
}

// ── Component ─────────────────────────────────────────────────────────────────

function viewAs(role: 'student' | 'teacher', navigate: ReturnType<typeof useNavigate>) {
  if (!localStorage.getItem(LS.ORIGINAL_USER)) {
    const currentUser = localStorage.getItem(LS.USER);
    const currentToken = localStorage.getItem(LS.TOKEN);
    if (currentUser) localStorage.setItem(LS.ORIGINAL_USER, currentUser);
    if (currentToken) localStorage.setItem(LS.ORIGINAL_TOKEN, currentToken);
  }
  try {
    const raw = localStorage.getItem(LS.ORIGINAL_USER) ?? localStorage.getItem(LS.USER) ?? '{}';
    const user = JSON.parse(raw) as { name?: string };
    if (role === 'student') {
      localStorage.setItem(LS.USER, JSON.stringify({ name: user.name ?? 'Admin', role: 'student' }));
      localStorage.setItem(LS.TOKEN, localStorage.getItem(LS.ORIGINAL_TOKEN) ?? '');
      navigate('/dashboard');
    } else {
      localStorage.setItem(LS.USER, JSON.stringify({ name: user.name ?? 'Admin', role: 'teacher', teacherId: 't-001' }));
      localStorage.setItem(LS.TOKEN, localStorage.getItem(LS.ORIGINAL_TOKEN) ?? '');
      navigate('/teacher/dashboard');
    }
  } catch { /* ignore */ }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const [stats, setStats] = useState<ApiStats | null>(null);
  useEffect(() => {
    apiFetch<ApiStats>('/api/stats')
      .then(setStats)
      .catch(() => { /* non-fatal: stats stay null, show — */ });
  }, []);

  const STATS = [
    { id: 'challenges', label: 'Total Challenges', value: stats?.challenges ?? '—', accent: 'purple', icon: <IconBolt />  },
    { id: 'courses',    label: 'Total Courses',    value: stats?.courses    ?? '—', accent: 'blue',   icon: <IconBook />  },
    { id: 'exams',      label: 'Active Exams',     value: stats?.exams      ?? '—', accent: 'green',  icon: <IconClip />  },
    { id: 'students',   label: 'Total Groups',     value: stats?.groups     ?? '—', accent: 'amber',  icon: <IconUsers /> },
  ] as const;

  return (
    <div className={styles.page}>

      {/* ── Welcome ── */}
      <section className={styles.welcome}>
        <div className={styles.welcomeText}>
          <p className={styles.welcomeEyebrow}>Admin Panel</p>
          <h1 className={styles.welcomeName}>Welcome, {user.name}</h1>
          <p className={styles.welcomeSub}>Here&apos;s an overview of the platform.</p>
        </div>
        <span className={styles.dateChip}>{today}</span>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsGrid}>
        {STATS.map(s => (
          <div key={s.id} className={`${styles.statCard} ${styles[`statCard_${s.accent}`]}`}>
            <div className={`${styles.statIcon} ${styles[`statIcon_${s.accent}`]}`}>
              {s.icon}
            </div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Quick Access ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Manage</p>
          <h2 className={styles.sectionTitle}>Quick Access</h2>
        </div>

        <div className={styles.quickGrid}>
          {QUICK_ACCESS.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`${styles.quickCard} ${styles[`quickCard_${item.accent}`]}`}
            >
              <div className={`${styles.quickIcon} ${styles[`quickIcon_${item.accent}`]}`}>
                {item.icon}
              </div>
              <h3 className={styles.quickLabel}>{item.label}</h3>
              <p className={styles.quickDesc}>{item.desc}</p>
              <span className={`${styles.quickCta} ${styles[`quickCta_${item.accent}`]}`}>
                {item.cta} <IconArrow />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Manage Users ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Users</p>
          <h2 className={styles.sectionTitle}>Manage Users</h2>
        </div>
        <div className={styles.quickGrid}>
          <Link to="/admin/users" className={`${styles.quickCard} ${styles.quickCard_amber}`}>
            <div className={`${styles.quickIcon} ${styles.quickIcon_amber}`}><IconUsers /></div>
            <h3 className={styles.quickLabel}>All Users</h3>
            <p className={styles.quickDesc}>Create, edit, change passwords, ban or delete student, teacher and admin accounts.</p>
            <span className={`${styles.quickCta} ${styles.quickCta_amber}`}>Go to users <IconArrow /></span>
          </Link>
        </div>
      </section>

      {/* ── Preview As ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Admin Tools</p>
          <h2 className={styles.sectionTitle}>Preview As</h2>
        </div>
        <div className={styles.previewBtnRow}>
          <button
            className={`${styles.previewBtn} ${styles.previewBtnStudent}`}
            onClick={() => viewAs('student', navigate)}
          >
            View as Student
          </button>
          <button
            className={`${styles.previewBtn} ${styles.previewBtnTeacher}`}
            onClick={() => viewAs('teacher', navigate)}
          >
            View as Teacher
          </button>
        </div>
      </section>

    </div>
  );
}
