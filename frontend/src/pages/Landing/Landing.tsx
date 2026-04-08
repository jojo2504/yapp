import { Link } from 'react-router-dom';
import styles from './Landing.module.css';

function IconTerminal() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export default function Landing() {
  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroGlowTop} />
        <div className={styles.heroGlowBottom} />

        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Built for developers, students &amp; universities
          </div>

          <h1 className={styles.headline}>
            Code. Learn.<br />
            <span className={styles.accentGradient}>Excel.</span>
          </h1>

          <p className={styles.subheadline}>
            Yapp is the all-in-one platform for mastering programming — tackle daily challenges,
            follow expert-led courses, and ace your university exams.
          </p>

          <div className={styles.ctaGroup}>
            <Link to="/challenges" className={styles.btnPrimary}>
              Start Challenges <IconArrow />
            </Link>
            <Link to="/courses" className={styles.btnSecondary}>
              Explore Courses
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features}>
        <p className={styles.sectionLabel}>What we offer</p>
        <h2 className={styles.sectionTitle}>Everything You Need to Excel</h2>
        <p className={styles.sectionSubtitle}>
          Three powerful tools, one platform — designed to take you from first
          line of code to exam-ready professional.
        </p>

        <div className={styles.featuresGrid}>

          {/* Challenges */}
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.iconChallenges}`}>
              <IconTerminal />
            </div>
            <h3 className={styles.featureTitle}>Coding Challenges</h3>
            <p className={styles.featureDesc}>
              Sharpen your algorithmic thinking with 500+ curated problems across
              data structures, algorithms, and system design. Compete on leaderboards
              and track your progress over time.
            </p>
            <Link to="/challenges" className={`${styles.featureLink} ${styles.featureLinkChallenges}`}>
              Browse challenges <IconArrow />
            </Link>
          </div>

          {/* Courses */}
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.iconCourses}`}>
              <IconBook />
            </div>
            <h3 className={styles.featureTitle}>Programming Courses</h3>
            <p className={styles.featureDesc}>
              Follow structured learning paths from beginner to advanced. Video
              lessons, interactive exercises, and hands-on projects guided by
              industry experts and top academics.
            </p>
            <Link to="/courses" className={`${styles.featureLink} ${styles.featureLinkCourses}`}>
              Explore courses <IconArrow />
            </Link>
          </div>

          {/* Exams */}
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.iconExams}`}>
              <IconClipboard />
            </div>
            <h3 className={styles.featureTitle}>Exam Sessions</h3>
            <p className={styles.featureDesc}>
              Prepare for university and school assessments with past-paper
              practice, timed exam simulations, and instant feedback — built
              in partnership with academic institutions.
            </p>
            <Link to="/exam" className={`${styles.featureLink} ${styles.featureLinkExams}`}>
              View exam sessions <IconArrow />
            </Link>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>Ya<span>pp</span></span>
          <ul className={styles.footerNav}>
            <li><Link to="/challenges">Challenges</Link></li>
            <li><Link to="/courses">Courses</Link></li>
            <li><Link to="/exam">Exams</Link></li>
          </ul>
          <span className={styles.footerCopyright}>
            &copy; {new Date().getFullYear()} Yapp. All rights reserved.
          </span>
        </div>
      </footer>

    </div>
  );
}
