import React, { createContext, useContext, useEffect, useState } from 'react';
import { queryClient } from '../lib/queryClient';
import { apiFetch } from '../lib/api';

type UserRole = 'admin' | 'waiter' | 'kitchen' | null;

export interface User {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
}

interface AuthContextType {
    session: any | null;
    user: User | null;
    role: UserRole;
    fullName: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    fullName: null,
    loading: true,
    signOut: async () => { },
    checkAuth: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const data = await apiFetch('/auth/me');
            setUser(data.user);
        } catch (error) {
            console.error('Session invalid or expired', error);
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();

        // Listen to storage events to sync auth state across tabs
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'token') {
                checkAuth();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const signOut = async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Failed to release session lock", e);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
            queryClient.clear();
            window.location.href = '/login';
        }
    };

    const session = user ? { user } : null;
    const role = user?.role || null;
    const fullName = user?.full_name || null;

    return (
        <AuthContext.Provider value={{ session, user, role, fullName, loading, signOut, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
