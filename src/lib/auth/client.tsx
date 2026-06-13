'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type ReactNode,
} from 'react';
import type { PublicUser } from './types';

interface AuthContextValue {
    user: PublicUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<PublicUser>;
    signup: (email: string, username: string, password: string) => Promise<PublicUser>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
    /** Require auth — returns user if logged in, or opens modal and awaits login/signup. */
    requireAuth: (reason?: string) => Promise<PublicUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}

type AuthModalRequest = {
    reason?: string;
    resolve: (user: PublicUser) => void;
    reject: (error: Error) => void;
};

/** Internal context for the modal to consume. */
interface AuthModalContextValue {
    request: AuthModalRequest | null;
    clearRequest: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue>({
    request: null,
    clearRequest: () => {},
});

export function useAuthModal() {
    return useContext(AuthModalContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalRequest, setModalRequest] = useState<AuthModalRequest | null>(null);
    const pendingRef = useRef<AuthModalRequest | null>(null);

    const refreshSession = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/session');
            const data = await res.json();
            setUser(data.authenticated ? data.user : null);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    const login = useCallback(async (email: string, password: string): Promise<PublicUser> => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        setUser(data.user);

        // Resolve any pending requireAuth
        if (pendingRef.current) {
            pendingRef.current.resolve(data.user);
            pendingRef.current = null;
            setModalRequest(null);
        }

        return data.user;
    }, []);

    const signup = useCallback(async (
        email: string,
        username: string,
        password: string,
    ): Promise<PublicUser> => {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        setUser(data.user);

        // Resolve any pending requireAuth
        if (pendingRef.current) {
            pendingRef.current.resolve(data.user);
            pendingRef.current = null;
            setModalRequest(null);
        }

        return data.user;
    }, []);

    const logout = useCallback(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
    }, []);

    const requireAuth = useCallback(async (reason?: string): Promise<PublicUser> => {
        // Already logged in
        if (user) return user;

        // Open modal and return a promise that resolves on login/signup
        return new Promise<PublicUser>((resolve, reject) => {
            const request: AuthModalRequest = { reason, resolve, reject };
            pendingRef.current = request;
            setModalRequest(request);
        });
    }, [user]);

    const clearRequest = useCallback(() => {
        if (pendingRef.current) {
            pendingRef.current.reject(new Error('Auth cancelled'));
            pendingRef.current = null;
        }
        setModalRequest(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, loading, login, signup, logout, refreshSession, requireAuth }}
        >
            <AuthModalContext.Provider value={{ request: modalRequest, clearRequest }}>
                {children}
            </AuthModalContext.Provider>
        </AuthContext.Provider>
    );
}
