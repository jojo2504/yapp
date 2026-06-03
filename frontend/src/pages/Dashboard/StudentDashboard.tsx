import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './StudentDashboard.module.css';
import { LS } from '../../constants/storage';
import { apiFetch } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiStats {
  submissions: number;
  solved: number;
  recent_submissions: {
    id: number;
    problem_id: number;
    language: string;
    verdict: string;
    created_at: string;
  }[];
}

// ── Quick access (static) ────────────────────────────────────────────────────

const QUICK_ACCESS = [
  {
    to: '/challenges',
    label: 'Challenges',
    desc: 'Pick up where you left off or tackle something new.',
    icon: <IconBolt />,
    accent: 'purple',
    cta: 'Browse challenges',
  },
  {
    to: '/courses',
    label: 'Courses',
    desc: 'Continue a course or explore structured learning paths.',
    icon: <IconBook />,
    accent: 'blue',
    cta: 'Explore courses',
  },
];

// ── Icons ────────────────────────────────────────────────────────────────────

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

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconArrowLeft14() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getUser() {
  try {
    const raw = localStorage.getItem(LS.USER);
    if (raw) return JSON.parse(raw) as { name: string; role: string };
  } catch { /* ignore */ }
  return { name: 'Student', role: 'student' };
}

function getOriginalUser() {
  try {
    const raw = localStorage.getItem(LS.ORIGINAL_USER);
    if (raw) return JSON.parse(raw) as { name: string; role: string };
  } catch { /* ignore */ }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const originalUser = getOriginalUser();
  const isAdminPreview = originalUser?.role === 'admin';

  const [stats, setStats] = useState<ApiStats | null>(null);

  useEffect(() => {
    apiFetch<ApiStats>('/api/stats/student')
      .then(setStats)
      .catch(() => { /* non-fatal */ });
  }, []);

  const STATS = [
    { id: 'solved',       label: 'Problems Solved',    value: stats?.solved       ?? 0, icon: <IconBolt />, accent: 'purple' },
    { id: 'submissions',  label: 'Total Submissions',  value: stats?.submissions  ?? 0, icon: <IconClip />, accent: 'blue'   },
  ];

  function restoreAdmin() {
    const originalUserStr = localStorage.getItem(LS.ORIGINAL_USER);
    const originalToken = localStorage.getItem(LS.ORIGINAL_TOKEN);
    if (originalUserStr) localStorage.setItem(LS.USER, originalUserStr);
    if (originalToken) localStorage.setItem(LS.TOKEN, originalToken);
    localStorage.removeItem(LS.ORIGINAL_USER);
    localStorage.removeItem(LS.ORIGINAL_TOKEN);
    navigate('/admin/dashboard');
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Admin preview banner ── */}
        {isAdminPreview && (
          <div className={styles.previewBanner}>
            <span className={styles.previewBannerText}>You are viewing as Student</span>
            <button className={styles.previewBannerBtn} onClick={restoreAdmin}>
              <IconArrowLeft14 /> Back to Admin
            </button>
          </div>
        )}

        {/* ── Welcome ── */}
        <section className={styles.welcome}>
          <div className={styles.welcomeText}>
            <p className={styles.greeting}>{getGreeting()},</p>
            <h1 className={styles.userName}>{user.name}</h1>
            <p className={styles.welcomeSub}>Here&apos;s your learning overview for today.</p>
          </div>
          <span className={styles.dateChip}>{today}</span>
        </section>

        {/* ── Stats ── */}
        <section className={styles.statsRow}>
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

        {/* ── Recent Activity ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>History</p>
              <h2 className={styles.sectionTitle}>Recent Activity</h2>
            </div>
            <Link to="/challenges" className={styles.viewAll}>View all <IconArrow /></Link>
          </div>

          <div className={styles.activityList}>
            <p className={styles.activityEmpty}>No recent activity yet.</p>
          </div>
        </section>

        {/* ── Quick Access ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Jump in</p>
              <h2 className={styles.sectionTitle}>Quick Access</h2>
            </div>
          </div>

          <div className={styles.quickGrid}>
            {QUICK_ACCESS.map(item => (
              <Link key={item.to + item.label} to={item.to} className={`${styles.quickCard} ${styles[`quickCard_${item.accent}`]}`}>
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

      </div>
    </div>
  );
}
