import styles from './ProfilePage.module.css';
import { LS } from '../../constants/storage';

interface UserProfile {
  name: string;
  role: string;
  teacherId?: string;
}

function getProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(LS.USER);
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch { /* ignore */ }
  return { name: 'Student', role: 'student' };
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ProfilePage() {
  const profile = getProfile();

  const details: { key: string; value: string }[] = [
    { key: 'Display name', value: profile.name },
    { key: 'Role',         value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1) },
    ...(profile.teacherId ? [{ key: 'Teacher ID', value: profile.teacherId }] : []),
    { key: 'Session',      value: localStorage.getItem(LS.TOKEN) ? 'Active' : 'None' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        <div className={styles.header}>
          <p className={styles.headerLabel}>Account</p>
          <h1 className={styles.headerTitle}>Profile</h1>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.avatar}>{initials(profile.name)}</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{profile.name}</span>
            <span className={styles.profileRole}>{profile.role}</span>
          </div>
        </div>

        <div className={styles.detailsCard}>
          <p className={styles.detailsTitle}>Account details</p>
          {details.map(d => (
            <div key={d.key} className={styles.detailRow}>
              <span className={styles.detailKey}>{d.key}</span>
              <span className={styles.detailVal}>{d.value}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
