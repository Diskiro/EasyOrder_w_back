import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { queryClient } from '../lib/queryClient'

type UserRole = 'admin' | 'waiter' | 'kitchen' | null

interface AuthContextType {
    session: Session | null
    user: User | null
    role: UserRole
    fullName: string | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    fullName: null,
    loading: true,
    signOut: async () => { },
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<UserRole>(null)
    const [fullName, setFullName] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // 10 Hours in milliseconds
    const SESSION_TIMEOUT_MS = 10 * 60 * 60 * 1000

    // Helper to check timeout
    const checkSessionTimeout = async (currentSession: Session | null) => {
        if (!currentSession?.user?.last_sign_in_at) return true

        const lastSignIn = new Date(currentSession.user.last_sign_in_at).getTime()
        const now = new Date().getTime()

        if (now - lastSignIn > SESSION_TIMEOUT_MS) {
            console.warn('Session expired (10 hours limit). Signing out and refreshing...')

            // Clear local state
            setSession(null)
            setUser(null)
            setRole(null)
            setFullName(null)
            setLoading(false)

            // Clean up session in Supabase (async)
            await signOut()

            // Clear Query Cache (using the imported instance if available, or just rely on reload)
            // Force Hard Reload to clear all memory/stale sockets
            window.location.href = '/login'

            return false // Session invalid
        }
        return true // Session valid
    }

    // Effect 1: Initialize Session & Auth Listener (Runs ONCE on mount)
    useEffect(() => {
        let mounted = true

        // 1. Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return
            checkSessionTimeout(session).then(isValid => {
                if (!mounted) return
                if (isValid) {
                    setSession(session)
                    setUser(session?.user ?? null)
                    if (session?.user) {
                        fetchUserRole(session.user.id)
                    } else {
                        setLoading(false)
                    }
                } else {
                    setLoading(false)
                }
            })
        })

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return
                // When auth state changes, check timeout too
                const isValid = await checkSessionTimeout(session)
                if (isValid) {
                    setSession(session)
                    setUser(session?.user ?? null)

                    if (session?.user) {
                        fetchUserRole(session.user.id)
                    } else {
                        setRole(null)
                        setFullName(null)
                        setLoading(false)
                    }
                }
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, []) // EMPTY DEPENDENCY ARRAY IS CRITICAL TO PREVENT INFINITE LOOP

    // Effect 2: Optimized Timeout Check (Timeout + Visibility Change)
    useEffect(() => {
        if (!session?.user?.last_sign_in_at) return

        const lastSignIn = new Date(session.user.last_sign_in_at).getTime()
        const now = new Date().getTime()
        const timeSinceLogin = now - lastSignIn
        const remainingTime = SESSION_TIMEOUT_MS - timeSinceLogin

        // If time already expired, sign out immediately
        if (remainingTime <= 0) {
            checkSessionTimeout(session)
            return
        }

        // Set timeout for the EXACT remaining time
        const timeout = setTimeout(() => {
            checkSessionTimeout(session)
        }, remainingTime)

        // Also check when tab becomes visible (in case computer slept)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkSessionTimeout(session)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearTimeout(timeout)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [session])

    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', userId)
                .maybeSingle()

            if (error) {
                console.error('Error fetching role:', error)
                setRole('waiter') // Fallback mostly for safety
                setFullName('User')
            } else if (!data) {
                console.warn('Profile missing for user, defaulting to waiter')
                setRole('waiter')
                setFullName('User')
            } else {
                setRole(data.role as UserRole)
                setFullName(data.full_name)
            }
        } catch (err) {
            console.error(err)
            setRole('waiter')
            setFullName('User')
        } finally {
            setLoading(false)
        }
    }

    const signOut = async () => {
        // Free up the active session flag BEFORE dropping token (so RLS Auth allows it)
        try {
            // Get current session explicitly since state might be out of sync
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            if (currentSession?.user?.id) {
                await supabase
                    .from('profiles')
                    .update({ is_logged_in: 0 })
                    .eq('id', currentSession.user.id)
            }
        } catch (e) {
            console.error("Failed to release session lock", e)
        }

        // Clear Supabase Session
        await supabase.auth.signOut()

        // Clear Auth Context State
        setRole(null)
        setFullName(null)
        setSession(null)
        setUser(null)

        // Clear TanStack Query Cache to remove sensitive/stale data
        queryClient.clear()
    }

    return (
        <AuthContext.Provider value={{ session, user, role, fullName, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
