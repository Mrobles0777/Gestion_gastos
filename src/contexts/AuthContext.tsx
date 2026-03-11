/**
 * AuthContext – Manages authentication state globally.
 * Rule I: UI is "dumb"; this context provides auth state only.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Safety timeout to prevent permanent hang
        const timeout = setTimeout(() => {
            if (isLoading) {
                console.warn('Auth session loading timed out.');
                setIsLoading(false);
            }
        }, 5000);

        supabase.auth.getSession()
            .then(({ data: { session: currentSession } }) => {
                setSession(currentSession);
            })
            .catch(err => {
                console.error('Failed to get auth session:', err);
            })
            .finally(() => {
                clearTimeout(timeout);
                setIsLoading(false);
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                setSession(newSession);
            },
        );

        return () => subscription.unsubscribe();
    }, []);

    async function signUpWithEmail(email: string, password: string) {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error ? new Error(error.message) : null };
    }

    async function signInWithEmail(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? new Error(error.message) : null };
    }

    async function signOut() {
        await supabase.auth.signOut();
    }

    const value: AuthContextType = {
        session,
        user: session?.user ?? null,
        isLoading,
        signUpWithEmail,
        signInWithEmail,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
