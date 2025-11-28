import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../../style/base.module.css'

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/ProfilePage');
            } else {
                setError(data.message || 'Email ou mot de passe incorrect');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur. Veuillez réessayer.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flexCenter" style={{
            minHeight: '100vh',
            padding: '2rem',
            backgroundColor: 'var(--bg-primary)'
        }}>
            <div className="card" style={{
                maxWidth: '450px',
                width: '100%',
                margin: '0 auto',

            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}>
                    </div>
                    <h2 style={{
                        fontSize: '1.8rem',
                        marginBottom: '0.5rem',
                        fontWeight: '600'
                    }}>
                        Connexion
                    </h2>
                    <p className="textSecondary">
                        Bon retour parmi nous !
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="alertError" style={{ marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
                        {/* Email Field */}
                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.label}>
                                Adresse email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className={styles.input}
                                placeholder="exemple@email.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                autoComplete="email"
                            />
                        </div>

                        {/* Password Field */}
                        <div className={styles.formGroup}>
                            <label htmlFor="password" className={styles.label}>
                                Mot de passe
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Remember & Forgot */}
                        <div className={styles.flexBetween} style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <input type="checkbox" />
                                <span className={styles.textSecondary} style={{ fontSize: '0.9rem' }}>
                        Se souvenir de moi
                    </span>
                            </label>
                            <Link
                                to="/auth/forgot-password"
                                style={{
                                    fontSize: '0.9rem',
                                    textDecoration: 'none',
                                    color: 'var(--accent-purple)'
                                }}
                            >
                                Mot de passe oublié ?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            style={{ width: '100%', marginBottom: '1rem' }}
                            disabled={loading}
                        >
                            {loading ? 'Connexion...' : 'Se connecter'}
                        </button>

                        {/* Divider */}
                        <div className={styles.divider}></div>

                        {/* Social Login */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnOutline}`}
                                style={{ width: '100%' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Continuer avec Google
                            </button>

                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnOutline}`}
                                style={{ width: '100%' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                </svg>
                                Continuer avec GitHub
                            </button>
                        </div>
                    </div>
                </form>

                {/* Sign Up Link */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <span className="textSecondary">Pas encore de compte ? </span>
                    <Link
                        to="/auth/register"
                        style={{
                            color: 'var(--accent-purple)',
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}
                    >
                        Créer un compte
                    </Link>
                </div>
            </div>
        </div>
    );
}