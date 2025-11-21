import { Link } from 'react-router-dom'
import styles from '../../style/base.module.css'

export default function HomePage() {
    return (
        <div className={styles.flexCenter} style={{ minHeight: '100vh', padding: '2rem' }}>
            <div style={{ maxWidth: '800px', width: '100%' }}>
                {/* Hero Section */}
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h1 style={{
                        fontSize: '3.5rem',
                        marginBottom: '1rem',
                        fontWeight: '700'
                    }}>
                        <span className={styles.textGradient}>
                            🎓 YAPP
                        </span>
                    </h1>
                    <p className={styles.textSecondary} style={{
                        fontSize: '1.2rem',
                        fontWeight: '500',
                        lineHeight: '1.6'
                    }}>
                        Bienvenue sur la plateforme d'apprentissage du code interactif
                    </p>
                </div>

                {/* CTA Section */}
                <div style={{ textAlign: 'center' }}>
                    <Link to="/auth/register" style={{ textDecoration: 'none' }}>
                        <button
                            className={styles.btnSuccess}
                            style={{
                                padding: '1rem 2.5rem',
                                fontSize: '1.1rem',
                                fontWeight: '600'
                            }}
                        >
                            Commencer à Coder →
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    )
}