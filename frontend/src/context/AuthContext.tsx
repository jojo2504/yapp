import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Types
export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    organisation_id: number;
    avatar_url?: string;
    is_active: boolean;
    email_verified: boolean;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string, organisationId: number) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem(USER_KEY);
            const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

            if (storedUser && accessToken) {
                try {
                    // Verify token is still valid by calling /me
                    const response = await fetch(`${API_URL}/api/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                    } else if (response.status === 401) {
                        // Try to refresh token
                        const refreshed = await tryRefreshToken();
                        if (!refreshed) {
                            clearAuth();
                        }
                    } else {
                        // Use stored user data as fallback
                        setUser(JSON.parse(storedUser));
                    }
                } catch (error) {
                    console.error('Auth init error:', error);
                    // Use stored user data as fallback
                    setUser(JSON.parse(storedUser));
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const tryRefreshToken = async (): Promise<boolean> => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                saveAuth(data.user, data.access_token, data.refresh_token);
                setUser(data.user);
                return true;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
        }

        return false;
    };

    const saveAuth = (user: User, accessToken: string, refreshToken: string) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    };

    const clearAuth = () => {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setUser(null);
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                saveAuth(data.user, data.access_token, data.refresh_token);
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Email ou mot de passe incorrect' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Erreur de connexion au serveur' };
        }
    };

    const register = async (
        name: string, 
        email: string, 
        password: string, 
        organisationId: number
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    organisation_id: organisationId
                })
            });

            const data = await response.json();

            if (response.ok) {
                saveAuth(data.user, data.access_token, data.refresh_token);
                setUser(data.user);
                return { success: true };
            } else {
                if (response.status === 409) {
                    return { success: false, error: 'Cette adresse email est déjà utilisée' };
                }
                return { success: false, error: data.error || "Erreur lors de l'inscription" };
            }
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: 'Erreur de connexion au serveur' };
        }
    };

    const logout = async () => {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        
        // Call logout API (optional, fire and forget)
        if (accessToken) {
            try {
                await fetch(`${API_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
            } catch (error) {
                console.error('Logout API error:', error);
            }
        }

        clearAuth();
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            register,
            logout,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Helper to get access token (for API calls)
export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}
