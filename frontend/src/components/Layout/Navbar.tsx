import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import { LS } from '../../constants/storage';

const NAV_LINKS = [
  { to: '/challenges',  label: 'Challenges'  },
  { to: '/courses',     label: 'Courses'     },
  { to: '/exam',        label: 'Exams'       },
  { to: '/playground',  label: 'Playground'  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Read directly from localStorage so every re-render (triggered by route
  // changes via NavLink's location subscription) reflects the current auth state.
  const isLoggedIn = Boolean(localStorage.getItem(LS.TOKEN));
  const storedUser = localStorage.getItem(LS.USER);
  const userRole: string = storedUser ? (JSON.parse(storedUser).role ?? '') : '';
  const dashboardTo = userRole === 'Admin' ? '/admin/dashboard' : '/dashboard';
  const logoTo = isLoggedIn ? dashboardTo : '/';

  function handleLogout() {
    localStorage.removeItem(LS.TOKEN);
    localStorage.removeItem(LS.USER);
    setOpen(false);
    navigate('/');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.link} ${styles.linkActive}` : styles.link;

  const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? `${styles.drawerLink} ${styles.drawerLinkActive}`
      : styles.drawerLink;

  return (
    <>
      <nav className={styles.navbar}>
        {/* Logo */}
        <Link to={logoTo} className={styles.logo}>
          Ya<span>pp</span>
        </Link>

        {/* Center links */}
        <ul className={styles.navLinks}>
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to} className={linkClass}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className={styles.actions}>
          {isLoggedIn ? (
            <>
              <Link to={dashboardTo} className={styles.btnLogin}>
                Dashboard
              </Link>
              <button className={styles.btnLogout} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.btnLogin}>
                Login
              </Link>
              <Link to="/signup" className={styles.btnSignUp}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setOpen(prev => !prev)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span className={open ? `${styles.bar} ${styles.barOpen}` : styles.bar} />
          <span className={open ? `${styles.bar} ${styles.barOpen}` : styles.bar} />
          <span className={open ? `${styles.bar} ${styles.barOpen}` : styles.bar} />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={open ? `${styles.drawer} ${styles.drawerOpen}` : styles.drawer}>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={drawerLinkClass}
            onClick={() => setOpen(false)}
          >
            {label}
          </NavLink>
        ))}
        <div className={styles.drawerDivider} />
        <div className={styles.drawerActions}>
          {isLoggedIn ? (
            <>
              <Link to={dashboardTo} className={styles.btnLogin} onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <button className={styles.btnLogout} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.btnLogin} onClick={() => setOpen(false)}>
                Login
              </Link>
              <Link to="/signup" className={styles.btnSignUp} onClick={() => setOpen(false)}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
