import { useState } from 'react'
import { AppProvider } from '@toolpad/core/AppProvider'
import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import { darkTheme } from '../theme'
import { useAuthActions } from '../hooks/useAuthActions'

import { LoginForm } from '../components/auth/LoginForm'
import { SignUpFlow } from '../components/auth/SignUpFlow'
import { RecoveryForm } from '../components/auth/RecoveryForm'

export default function Login() {
    // Modes: 'signin' | 'signup' | 'recovery'
    const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>('signin')
    const navigate = useNavigate()

    // Auth actions exposed by our custom hook
    const { handleSignIn } = useAuthActions()

    return (
        <AppProvider theme={darkTheme}>
            <Box
                sx={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'background.default',
                    overflow: 'hidden'
                }}
            >
                {mode === 'signin' && (
                    <LoginForm
                        onSignIn={(provider, formData) => handleSignIn(provider, formData, navigate)}
                        onRecoveryClick={() => setMode('recovery')}
                        onRegisterClick={() => setMode('signup')}
                    />
                )}

                {mode === 'signup' && (
                    <SignUpFlow
                        onBack={() => setMode('signin')}
                    />
                )}

                {mode === 'recovery' && (
                    <RecoveryForm
                        onBack={() => setMode('signin')}
                    />
                )}
            </Box>
        </AppProvider>
    )
}

