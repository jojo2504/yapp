import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import { LS } from '../../constants/storage';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconClip() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconEyeStudent() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function IconEyeTeacher() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard',   label: 'Dashboard',          icon: <IconGrid /> },
  { to: '/admin/challenges',  label: 'Manage Challenges',  icon: <IconBolt /> },
  { to: '/admin/courses',     label: 'Manage Courses',     icon: <IconBook /> },
  { to: '/admin/exams',       label: 'Manage Exams',       icon: <IconClip /> },
  { to: '/admin/groups',      label: 'Groups',             icon: <IconUsers /> },
  { to: '/admin/users',       label: 'Manage Users',       icon: <IconUsers /> },
];

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
      localStorage.setItem(LS.TOKEN, 'mock-student-jwt-token');
      navigate('/dashboard');
    } else {
      localStorage.setItem(LS.USER, JSON.stringify({ name: user.name ?? 'Admin', role: 'teacher', teacherId: 't-001' }));
      localStorage.setItem(LS.TOKEN, 'mock-teacher-jwt-token');
      navigate('/teacher/dashboard');
    }
  } catch { /* ignore */ }
}

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className={styles.layout}>

      <aside className={styles.sidebar}>
        <p className={styles.sidebarHeading}>Admin Panel</p>

        <nav className={styles.sidebarNav}>
          {SIDEBAR_LINKS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? `${styles.sidebarLink} ${styles.sidebarLinkActive}`
                  : styles.sidebarLink
              }
            >
              <span className={styles.sidebarIcon}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarDivider} />
          <p className={styles.viewAsLabel}>Preview as</p>
          <div className={styles.viewAsGroup}>
            <button
              className={`${styles.viewAsBtn} ${styles.viewAsBtnStudent}`}
              onClick={() => viewAs('student', navigate)}
            >
              <IconEyeStudent />
              View as Student
            </button>
            <button
              className={`${styles.viewAsBtn} ${styles.viewAsBtnTeacher}`}
              onClick={() => viewAs('teacher', navigate)}
            >
              <IconEyeTeacher />
              View as Teacher
            </button>
          </div>
          <div className={styles.sidebarDivider} />
          <Link to="/dashboard" className={styles.backLink}>
            <IconArrowLeft />
            Back to site
          </Link>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

    </div>
  );
}
