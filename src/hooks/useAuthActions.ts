import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useUI } from '../context/UIContext'
import type { AuthProvider } from '@toolpad/core/SignInPage'

export function useAuthActions() {
    const { showAlert } = useUI()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const handleSignIn = async (_provider: AuthProvider, formData: any) => {
        try {
            const email = formData.get('email') as string
            const password = formData.get('password') as string

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            // --- Strict Active Session Logic ---
            if (data?.user) {
                // Check if the user is already logged in
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_logged_in')
                    .eq('id', data.user.id)
                    .single()

                if (profile?.is_logged_in === 1) {
                    // Block access, bounce them out
                    await supabase.auth.signOut()
                    throw new Error("Tú o alguien más ya tiene una sesión iniciada activa con esta cuenta.")
                }

                // Allow login, mark as active
                await supabase
                    .from('profiles')
                    .update({ is_logged_in: 1 })
                    .eq('id', data.user.id)
            }
            // --- End Logic ---

            // Force hard refresh to ensure clean state
            window.location.href = '/'
            return { data, error: undefined }
        } catch (error: any) {
            showAlert(error.message || 'Error al iniciar sesión', 'error')
            return { data: { user: null, session: null }, error: error.message }
        }
    }

    const handleVerifyAdmin = async (adminEmail: string, adminPassword: string): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword,
            })

            if (error) throw error

            // Check if this user is actually an admin
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single()

            if (profileError || profile?.role !== 'admin') {
                // Not an admin, sign out
                await supabase.auth.signOut()
                throw new Error('Solo los administradores pueden registrar nuevo personal.')
            }

            return true

        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleSecureSignUp = async (signupEmail: string, signupPassword: string, fullName: string, role: string = 'waiter'): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signUp({
                email: signupEmail,
                password: signupPassword,
                options: {
                    data: {
                        full_name: fullName,
                        role,
                    }
                }
            })

            if (error) throw error

            // --- Strict Active Session Logic ---
            if (data?.user) {
                // Set to active explicitly on register
                await supabase
                    .from('profiles')
                    .update({ is_logged_in: 1 })
                    .eq('id', data.user.id)
            }
            // --- End Logic ---

            showAlert('Usuario registrado exitosamente!', 'success')
            return true
        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleRecovery = async (recoveryEmail: string): Promise<boolean> => {
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
                redirectTo: window.location.origin + '/update-password',
            })
            if (error) throw error
            setMessage('Check your email for the password reset link.')
            showAlert('Correo de recuperación enviado. Revisa tu bandeja de entrada.', 'success')
            return true
        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
            return false
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        error,
        message,
        handleSignIn,
        handleVerifyAdmin,
        handleSecureSignUp,
        handleRecovery,
        setError,
        setMessage
    }
}
