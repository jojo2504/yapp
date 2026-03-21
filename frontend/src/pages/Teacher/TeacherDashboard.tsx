import { Link, useNavigate } from 'react-router-dom';
import styles from './TeacherDashboard.module.css';
import { LS } from '../../constants/storage';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeacherUser {
  name: string;
  role: string;
  teacherId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTeacher(): TeacherUser {
  try {
    const raw = localStorage.getItem(LS.USER);
    if (raw) return JSON.parse(raw) as TeacherUser;
  } catch { /* ignore */ }
  return { name: 'Teacher', role: 'teacher', teacherId: '' };
}

function getOriginalUser() {
  try {
    const raw = localStorage.getItem(LS.ORIGINAL_USER);
    if (raw) return JSON.parse(raw) as { name: string; role: string };
  } catch { /* ignore */ }
  return null;
}

function IconArrowLeft14() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function loadCount(key: string, teacherId: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const items = JSON.parse(raw) as Array<{ teacherId: string }>;
      return items.filter(i => i.teacherId === teacherId).length;
    }
  } catch { /* ignore */ }
  return 0;
}

// ── Icons (20px for stat cards) ───────────────────────────────────────────────

function IconBolt20() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconBook20() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconClip20() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconUsers20() {
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

// ── Quick access config ───────────────────────────────────────────────────────

const QUICK_ACCESS = [
  {
    to: '/teacher/challenges',
    label: 'My Challenges',
    desc: 'Create and manage coding challenges assigned to your students.',
    icon: <IconBolt20 />,
    accent: 'teal',
    cta: 'Go to challenges',
  },
  {
    to: '/teacher/courses',
    label: 'My Courses',
    desc: 'Build course modules and assign them to your student groups.',
    icon: <IconBook20 />,
    accent: 'blue',
    cta: 'Go to courses',
  },
  {
    to: '/teacher/exams',
    label: 'My Exams',
    desc: 'Schedule exam sessions and monitor proctoring violations.',
    icon: <IconClip20 />,
    accent: 'green',
    cta: 'Go to exams',
  },
  {
    to: '/teacher/groups',
    label: 'My Groups',
    desc: 'Organise students into groups and assign courses to them.',
    icon: <IconUsers20 />,
    accent: 'amber',
    cta: 'Go to groups',
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const teacher = getTeacher();
  const tid     = teacher.teacherId;
  const today   = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const originalUser = getOriginalUser();
  const isAdminPreview = originalUser?.role === 'admin';

  function restoreAdmin() {
    const originalUserStr = localStorage.getItem(LS.ORIGINAL_USER);
    const originalToken = localStorage.getItem(LS.ORIGINAL_TOKEN);
    if (originalUserStr) localStorage.setItem(LS.USER, originalUserStr);
    if (originalToken) localStorage.setItem(LS.TOKEN, originalToken);
    localStorage.removeItem(LS.ORIGINAL_USER);
    localStorage.removeItem(LS.ORIGINAL_TOKEN);
    navigate('/admin/dashboard');
  }

  const challengeCount = loadCount(LS.T_CHALLENGES, tid);
  const courseCount    = loadCount(LS.T_COURSES,    tid);
  const examCount      = loadCount(LS.T_EXAMS,      tid);
  const groupCount     = loadCount(LS.T_GROUPS,     tid);

  const STATS = [
    { id: 'challenges', label: 'My Challenges', value: challengeCount, accent: 'teal',  icon: <IconBolt20 />  },
    { id: 'courses',    label: 'My Courses',    value: courseCount,    accent: 'blue',  icon: <IconBook20 />  },
    { id: 'exams',      label: 'My Exams',      value: examCount,      accent: 'green', icon: <IconClip20 />  },
    { id: 'groups',     label: 'My Groups',     value: groupCount,     accent: 'amber', icon: <IconUsers20 /> },
  ] as const;

  return (
    <div className={styles.page}>

      {/* ── Admin preview banner ── */}
      {isAdminPreview && (
        <div className={styles.previewBanner}>
          <span className={styles.previewBannerText}>You are viewing as Teacher</span>
          <button className={styles.previewBannerBtn} onClick={restoreAdmin}>
            <IconArrowLeft14 /> Back to Admin
          </button>
        </div>
      )}

      {/* ── Welcome ── */}
      <section className={styles.welcome}>
        <div className={styles.welcomeText}>
          <p className={styles.welcomeEyebrow}>Teacher Panel</p>
          <h1 className={styles.welcomeName}>Welcome, {teacher.name}</h1>
          <p className={styles.welcomeSub}>Manage your content — only you can see what you create.</p>
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
          <p className={styles.sectionLabel}>Navigate</p>
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

    </div>
  );
}
