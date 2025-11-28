import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Appel API au backend
            const response = await fetch('http://localhost:8080/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
            } else {
                setError(data.message || 'Une erreur est survenue');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur. Veuillez réessayer.');
            console.error('Forgot password error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flexCenter" style={{ minHeight: '100vh', padding: '2rem' }}>
                <div className="card" style={{ maxWidth: '450px', width: '100%', textAlign: 'center' }}>
                    {/* Success Icon */}
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '1rem',
                        color: 'var(--accent-green)'
                    }}>
                        ✓
                    </div>

                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                        Email envoyé !
                    </h2>

                    <p className="textSecondary" style={{ marginBottom: '2rem' }}>
                        Nous avons envoyé un lien de réinitialisation à{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                        <br /><br />
                        Vérifiez votre boîte de réception et suivez les instructions.
                    </p>

                    <Link to="/auth/login">
                        <button className="btn btnPrimary" style={{ width: '100%' }}>
                            Retour à la connexion
                        </button>
                    </Link>

                    <p className="textMuted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
                        Vous n'avez pas reçu l'email ?{' '}
                        <button
                            onClick={() => setSuccess(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-purple)',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            Renvoyer
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flexCenter" style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 className="textGradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                        🎓 EduCode
                    </h1>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                        Mot de passe oublié ?
                    </h2>
                    <p className="textSecondary">
                        Pas de problème ! Entrez votre email et nous vous enverrons un lien de réinitialisation.
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
                    {/* Email Field */}
                    <div className="formGroup">
                        <label htmlFor="email" className="label">
                            Adresse email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="input"
                            placeholder="exemple@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btnPrimary"
                        style={{ width: '100%', marginBottom: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                    </button>

                    {/* Back to Login */}
                    <Link to="/auth/login">
                        <button
                            type="button"
                            className="btn btnGhost"
                            style={{ width: '100%' }}
                        >
                            ← Retour à la connexion
                        </button>
                    </Link>
                </form>
            </div>
        </div>
    );
}