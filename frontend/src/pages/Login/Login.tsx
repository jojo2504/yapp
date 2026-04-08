
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Invalid email or password.');
      localStorage.setItem('token', data.access_token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      const role: string = data.user?.role ?? '';
      if (role === 'Admin') navigate('/admin/dashboard');
      else if (role === 'Teacher') navigate('/teacher/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.glow} />

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Link to="/" className={styles.logo}>Ya<span>pp</span></Link>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue learning</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.errorBanner}>{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className={styles.footerLink}>Sign up</Link>
        </p>

      </div>
    </div>
  );
}
