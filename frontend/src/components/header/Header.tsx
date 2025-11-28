import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import styles from '../../style/base.module.css';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isActive = (path: string) => location.pathname === path;

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get user initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        setIsMenuOpen(false);
        navigate('/');
    };

    return (
        <header style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: 'var(--shadow-sm)'
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '0 var(--space-xl)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '70px'
            }}>
                {/* Logo Section */}
                <Link to="/" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textDecoration: 'none',
                    transition: 'all var(--transition-base)'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'var(--gradient-primary)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--glow-purple)'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🎓</span>
                    </div>
                    <span style={{
                        fontSize: '1.5rem',
                        fontWeight: 'var(--font-bold)',
                        letterSpacing: '-0.5px'
                    }}>
                        <span className={styles.textGradient}>Yapp</span>
                    </span>
                </Link>

                {/* Navigation Links - Desktop */}
                <nav style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flex: 1,
                    justifyContent: 'center'
                }}
                     className={styles.hideOnMobile}>
                    <Link
                        to="/"
                        style={{
                            padding: '0.6rem 1.2rem',
                            textDecoration: 'none',
                            color: isActive('/') ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 'var(--font-medium)',
                            fontSize: 'var(--text-base)',
                            borderRadius: 'var(--radius-md)',
                            transition: 'all var(--transition-base)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: isActive('/') ? 'rgba(203, 166, 247, 0.1)' : 'transparent'
                        }}
                    >
                        🏠 Accueil
                    </Link>
                    <Link
                        to="/code"
                        style={{
                            padding: '0.6rem 1.2rem',
                            textDecoration: 'none',
                            color: isActive('/code') ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 'var(--font-medium)',
                            fontSize: 'var(--text-base)',
                            borderRadius: 'var(--radius-md)',
                            transition: 'all var(--transition-base)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: isActive('/code') ? 'rgba(203, 166, 247, 0.1)' : 'transparent'
                        }}
                    >
                        💻 Éditeur
                    </Link>
                    <Link
                        to="/problems"
                        style={{
                            padding: '0.6rem 1.2rem',
                            textDecoration: 'none',
                            color: isActive('/problems') ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 'var(--font-medium)',
                            fontSize: 'var(--text-base)',
                            borderRadius: 'var(--radius-md)',
                            transition: 'all var(--transition-base)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: isActive('/problems') ? 'rgba(203, 166, 247, 0.1)' : 'transparent'
                        }}
                    >
                        📋 Problèmes
                    </Link>
                    <Link
                        to="/leaderboard"
                        style={{
                            padding: '0.6rem 1.2rem',
                            textDecoration: 'none',
                            color: isActive('/leaderboard') ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 'var(--font-medium)',
                            fontSize: 'var(--text-base)',
                            borderRadius: 'var(--radius-md)',
                            transition: 'all var(--transition-base)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: isActive('/leaderboard') ? 'rgba(203, 166, 247, 0.1)' : 'transparent'
                        }}
                    >
                        🏆 Classement
                    </Link>
                </nav>

                {/* User Section or Auth Buttons */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}
                     className={styles.hideOnMobile}>
                    {isAuthenticated && user ? (
                        <>
                            {/* User Profile with Dropdown */}
                            <div style={{ position: 'relative' }} ref={dropdownRef}>
                                <div
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.4rem 1rem 0.4rem 0.4rem',
                                        backgroundColor: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-xl)',
                                        border: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-base)'
                                    }}
                                >
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: user.avatar_url ? `url(${user.avatar_url})` : 'var(--gradient-primary)',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'var(--font-bold)',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-dark)'
                                    }}>
                                        {!user.avatar_url && getInitials(user.name)}
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <span style={{
                                            fontWeight: 'var(--font-medium)',
                                            color: 'var(--text-primary)',
                                            fontSize: 'var(--text-base)',
                                            display: 'block'
                                        }}>
                                            {user.name}
                                        </span>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)',
                                            display: 'block'
                                        }}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--text-secondary)',
                                        transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }}>
                                        ▼
                                    </span>
                                </div>

                                {/* Dropdown Menu */}
                                {showUserMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 0.5rem)',
                                        right: 0,
                                        backgroundColor: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-lg)',
                                        boxShadow: 'var(--shadow-lg)',
                                        minWidth: '220px',
                                        padding: '0.5rem',
                                        zIndex: 1000
                                    }}>
                                        {/* User info header */}
                                        <div style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid var(--border-color)',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div style={{
                                                fontWeight: 'var(--font-semibold)',
                                                color: 'var(--text-primary)',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {user.name}
                                            </div>
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: 'var(--text-muted)'
                                            }}>
                                                {user.email}
                                            </div>
                                            <div style={{
                                                display: 'inline-block',
                                                marginTop: '0.5rem',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: '600',
                                                backgroundColor: user.role === 'Admin'
                                                    ? 'rgba(243, 139, 168, 0.2)'
                                                    : user.role === 'Teacher'
                                                        ? 'rgba(203, 166, 247, 0.2)'
                                                        : 'rgba(137, 180, 250, 0.2)',
                                                color: user.role === 'Admin'
                                                    ? 'var(--accent-red)'
                                                    : user.role === 'Teacher'
                                                        ? 'var(--accent-purple)'
                                                        : 'var(--accent-blue)'
                                            }}>
                                                {user.role}
                                            </div>
                                        </div>

                                        <Link
                                            to="/profile"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                textDecoration: 'none',
                                                color: 'var(--text-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                transition: 'all var(--transition-base)',
                                                backgroundColor: 'transparent'
                                            }}
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            <span>👤</span>
                                            <span>Mon Profil</span>
                                        </Link>
                                        <Link
                                            to="/my-submissions"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                textDecoration: 'none',
                                                color: 'var(--text-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                transition: 'all var(--transition-base)',
                                                backgroundColor: 'transparent'
                                            }}
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            <span>📊</span>
                                            <span>Mes Soumissions</span>
                                        </Link>
                                        <Link
                                            to="/settings"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                textDecoration: 'none',
                                                color: 'var(--text-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                transition: 'all var(--transition-base)',
                                                backgroundColor: 'transparent'
                                            }}
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            <span>⚙️</span>
                                            <span>Paramètres</span>
                                        </Link>

                                        {/* Admin/Teacher only */}
                                        {(user.role === 'Admin' || user.role === 'Teacher') && (
                                            <>
                                                <div style={{
                                                    height: '1px',
                                                    backgroundColor: 'var(--border-color)',
                                                    margin: '0.5rem 0'
                                                }}></div>
                                                <Link
                                                    to="/admin"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        padding: '0.75rem 1rem',
                                                        textDecoration: 'none',
                                                        color: 'var(--accent-purple)',
                                                        borderRadius: 'var(--radius-md)',
                                                        transition: 'all var(--transition-base)',
                                                        backgroundColor: 'transparent'
                                                    }}
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <span>🛠️</span>
                                                    <span>Administration</span>
                                                </Link>
                                            </>
                                        )}

                                        <div style={{
                                            height: '1px',
                                            backgroundColor: 'var(--border-color)',
                                            margin: '0.5rem 0'
                                        }}></div>
                                        <button
                                            onClick={handleLogout}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                width: '100%',
                                                textAlign: 'left',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                color: 'var(--accent-red)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                transition: 'all var(--transition-base)',
                                                fontSize: 'var(--text-base)',
                                                fontFamily: 'inherit'
                                            }}
                                        >
                                            <span>🚪</span>
                                            <span>Déconnexion</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Login and Register buttons when not connected */}
                            <Link to="/auth/login">
                                <button className={`${styles.btn} ${styles.btnOutline}`}>
                                    Connexion
                                </button>
                            </Link>
                            <Link to="/auth/register">
                                <button className={`${styles.btn} ${styles.btnPrimary}`}>
                                    S'inscrire
                                </button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className={styles.showOnMobile}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-md)'
                    }}
                >
                    {isMenuOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className={styles.showOnMobile} style={{
                    display: 'none',
                    flexDirection: 'column',
                    padding: 'var(--space-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    <Link
                        to="/"
                        style={{
                            padding: '0.75rem 1rem',
                            textDecoration: 'none',
                            color: isActive('/') ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 'var(--font-medium)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: isActive('/') ? 'rgba(203, 166, 247, 0.1)' : 'transparent',
                            marginBottom: '0.5rem'
                        }}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        🏠 Accueil
                    </Link>
                    <Link
                        to="/code"
                        style={{
                            padding: '0.75rem 1rem',
                            textDecoration: 'none',
                            color: isActive('/code') ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 'var(--font-medium)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: isActive('/code') ? 'rgba(203, 166, 247, 0.1)' : 'transparent',
                            marginBottom: '0.5rem'
                        }}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        💻 Éditeur
                    </Link>
                    <Link
                        to="/problems"
                        style={{
                            padding: '0.75rem 1rem',
                            textDecoration: 'none',
                            color: isActive('/problems') ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 'var(--font-medium)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: isActive('/problems') ? 'rgba(203, 166, 247, 0.1)' : 'transparent',
                            marginBottom: '0.5rem'
                        }}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        📋 Problèmes
                    </Link>
                    <Link
                        to="/leaderboard"
                        style={{
                            padding: '0.75rem 1rem',
                            textDecoration: 'none',
                            color: isActive('/leaderboard') ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 'var(--font-medium)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: isActive('/leaderboard') ? 'rgba(203, 166, 247, 0.1)' : 'transparent'
                        }}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        🏆 Classement
                    </Link>

                    <div style={{
                        height: '1px',
                        backgroundColor: 'var(--border-color)',
                        margin: 'var(--space-md) 0'
                    }}></div>

                    {isAuthenticated && user ? (
                        <>
                            {/* User info on mobile */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                padding: 'var(--space-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    paddingBottom: '0.75rem',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: user.avatar_url ? `url(${user.avatar_url})` : 'var(--gradient-primary)',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'var(--font-bold)',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-dark)'
                                    }}>
                                        {!user.avatar_url && getInitials(user.name)}
                                    </div>
                                    <div>
                                        <span style={{
                                            fontWeight: 'var(--font-semibold)',
                                            color: 'var(--text-primary)',
                                            display: 'block'
                                        }}>
                                            {user.name}
                                        </span>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Link
                                to="/profile"
                                style={{
                                    padding: '0.75rem 1rem',
                                    textDecoration: 'none',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 'var(--font-medium)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                👤 Mon Profil
                            </Link>
                            <Link
                                to="/my-submissions"
                                style={{
                                    padding: '0.75rem 1rem',
                                    textDecoration: 'none',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 'var(--font-medium)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                📊 Mes Soumissions
                            </Link>
                            <Link
                                to="/settings"
                                style={{
                                    padding: '0.75rem 1rem',
                                    textDecoration: 'none',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 'var(--font-medium)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                ⚙️ Paramètres
                            </Link>
                            <button
                                onClick={handleLogout}
                                style={{
                                    padding: '0.75rem 1rem',
                                    width: '100%',
                                    textAlign: 'left',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: 'var(--accent-red)',
                                    fontWeight: 'var(--font-medium)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: 'var(--text-base)',
                                    fontFamily: 'inherit'
                                }}
                            >
                                🚪 Déconnexion
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/auth/login"
                                style={{
                                    padding: '0.75rem 1rem',
                                    textDecoration: 'none',
                                    color: 'var(--accent-purple)',
                                    fontWeight: 'var(--font-semibold)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    backgroundColor: 'rgba(203, 166, 247, 0.1)',
                                    marginBottom: '0.5rem',
                                    border: '1px solid var(--accent-purple)'
                                }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Connexion
                            </Link>
                            <Link
                                to="/auth/register"
                                style={{
                                    padding: '0.75rem 1rem',
                                    textDecoration: 'none',
                                    color: 'var(--text-dark)',
                                    fontWeight: 'var(--font-semibold)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    background: 'var(--gradient-primary)'
                                }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                S'inscrire
                            </Link>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}