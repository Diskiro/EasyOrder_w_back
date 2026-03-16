import { useState } from 'react';
import { useUI } from '../context/UIContext';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { AuthProvider } from '@toolpad/core/SignInPage';

export function useAuthActions() {
    const { showAlert } = useUI();
    const { checkAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [overrideLock, setOverrideLock] = useState(false);

    const handleSignIn = async (_provider: AuthProvider, formData: any, navigate?: (path: string) => void) => {
        setLoading(true);
        try {
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;

            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, overrideLock }),
            });

            localStorage.setItem('token', data.token);

            // Important: Wait for the React Context to acknowledge the new user 
            // BEFORE triggering the React Router navigation, otherwise ProtectedRoute kicks us back silently.
            await checkAuth();

            if (navigate) {
                navigate('/');
            } else {
                window.location.href = '/';
            }
            return { data, error: undefined };
        } catch (error: any) {
            if (error.message.includes('Ya hay una sesión iniciada')) {
                setOverrideLock(true);
                showAlert("Ya hay una sesión iniciada. Pulsa 'Ingresar' de nuevo para FORZAR tu acceso.", 'warning');
            } else {
                showAlert(error.message || 'Error al iniciar sesión', 'error');
            }
            return { data: { user: null, session: null }, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAdmin = async (adminEmail: string, adminPassword: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            // Send to a specialized verify-admin endpoint
            await apiFetch('/auth/verify-admin', {
                method: 'POST',
                body: JSON.stringify({ email: adminEmail, password: adminPassword }),
            });
            return true;
        } catch (err: any) {
            setError(err.message);
            showAlert(err.message, 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSecureSignUp = async (signupEmail: string, signupPassword: string, fullName: string, role: string = 'waiter'): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email: signupEmail, password: signupPassword, fullName, role }),
            });
            showAlert('Usuario registrado exitosamente!', 'success');
            return true;
        } catch (err: any) {
            setError(err.message);
            showAlert(err.message, 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleRecovery = async (_recoveryEmail: string): Promise<boolean> => {
        showAlert('La recuperación de contraseñas no está disponible en la red local. Contacta al administrador.', 'warning');
        return false;
    };

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
    };
}
