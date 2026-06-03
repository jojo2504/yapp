import { Link } from 'react-router-dom';
import styles from './Landing.module.css';
import { LS } from '../../constants/storage';

// Assets
import yappLogo from '../../assets/Logo/YAPPlogo.png';
import ClassicRedCrystal from '../../assets/LandingGeometry/ClassicRedCrystal.png';
import DiamondRubyCrystals from '../../assets/LandingGeometry/DiamondRubyCrystals.png';
import LongRedCrystal from '../../assets/LandingGeometry/LongRedCrystal.png';
import LongCrystal from '../../assets/LandingGeometry/LongCrystal.png';
import RoundedCrystal from '../../assets/LandingGeometry/RoundedCrystals.png';
import RoundedSmallCrystal from '../../assets/LandingGeometry/RoundedSmallCrystal.png';
import LittleRedDot from '../../assets/LandingGeometry/LittleRedDot.png';
import Pastille from '../../assets/LandingGeometry/Pastille.png';
import GeometryMesh from '../../assets/LandingGeometry/GeometryMesh.webp';

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function Landing() {
  const isLoggedIn = Boolean(localStorage.getItem(LS.TOKEN));
  const storedUser = localStorage.getItem(LS.USER);
  const userRole: string = storedUser ? (JSON.parse(storedUser).role ?? '') : '';
  const dashboardTo = userRole === 'Admin' ? '/admin/dashboard' : '/dashboard';

  return (
    <div className={styles.page}>

      {/* ── Navbar ── */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}>
          <img src={yappLogo} alt="YAPP" className={styles.logoImg} />
          <span className={styles.logoText}>APP</span>
        </Link>

        <ul className={styles.navLinks}>
          <li><Link to="/challenges">Challenges</Link></li>
          <li><Link to="/courses">Courses</Link></li>
          <li><Link to="/exam">Examens</Link></li>
          <li><Link to="/playground">Playground</Link></li>
        </ul>

        <div className={styles.navActions}>
          {isLoggedIn ? (
            <>
              <Link to={dashboardTo} className={styles.btnDashboard}>Dashboard</Link>
              <Link to="/" className={styles.btnLogout} onClick={() => {
                localStorage.removeItem(LS.TOKEN);
                localStorage.removeItem(LS.USER);
              }}>Logout</Link>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.btnDashboard}>Login</Link>
              <Link to="/signup" className={styles.btnLogout}>Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          {/* GeometryMesh behind the title */}
          <img src={GeometryMesh} alt="" className={styles.meshBg} />

          <h1 className={styles.headline}>
            Codez.<br />
            Apprenez.<br />
            <span className={styles.accentRuby}>Evaluez.</span>
          </h1>

          <div className={styles.badge}>
            <img src={Pastille} alt="" className={styles.badgeIcon} />
            <span>Concu pour les futurs developpeurs</span>
          </div>

          <div className={styles.ctaGroup}>
            <Link to="/challenges" className={styles.btnPrimary}>
              Commencer un Challenge <IconArrow />
            </Link>
            <Link to="/courses" className={styles.btnSecondary}>
              Explorer les Cours
            </Link>
          </div>
        </div>

        <div className={styles.heroRight}>
          {/* Code snippet card — Apple window style */}
          <div className={styles.codeCard}>
            <div className={styles.codeCardHeader}>
              <div className={styles.trafficLights}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <span className={styles.codeCardLang}># Python</span>
              <span className={styles.codeCardSearch}><IconSearch /></span>
            </div>
            <pre className={styles.codeBlock}>
              <code>
{`def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target-n], i]
        seen[n] = i`}
              </code>
            </pre>
          </div>

          {/* Floating crystals — precise placement */}
          {/* DiamondRuby: above window, slightly left */}
          <img src={DiamondRubyCrystals} alt="" className={`${styles.crystal} ${styles.crystalAbove}`} />
          {/* ClassicRedCrystal: below window, aligned with DiamondRuby */}
          <img src={ClassicRedCrystal} alt="" className={`${styles.crystal} ${styles.crystalBelow}`} />
          {/* LongRedCrystal: bottom-right, overlapping code window */}
          <img src={LongRedCrystal} alt="" className={`${styles.crystal} ${styles.crystalLongRed}`} />
          {/* LongCrystal: top-left symmetric, overlapping code window */}
          <img src={LongCrystal} alt="" className={`${styles.crystal} ${styles.crystalLongPink}`} />
          {/* RoundedSmallCrystal: behind top-left corner of window */}
          <img src={RoundedSmallCrystal} alt="" className={`${styles.crystal} ${styles.crystalRound}`} />
          {/* LittleRedDot: left, vertically centered */}
          <img src={LittleRedDot} alt="" className={`${styles.crystal} ${styles.crystalDot}`} />
          {/*RoundedCrystal top left behind the window */}
          <img src={RoundedCrystal} alt="" className={`${styles.crystal} ${styles.crystalTopLeft}`} />
        </div>
      </section>
    </div>
  );
}
