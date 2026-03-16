import { Box, Typography, Link, Button } from '@mui/material'
import { ShieldCheck } from 'lucide-react'
import { SignInPage, type AuthProvider } from '@toolpad/core/SignInPage'

const providers = [{ id: 'credentials', name: 'Email and Password' }]

interface LoginFormProps {
    onSignIn: (provider: AuthProvider, formData: any) => Promise<any>
    onRecoveryClick: () => void
    onRegisterClick: () => void
}

export function LoginForm({ onSignIn, onRecoveryClick, onRegisterClick }: LoginFormProps) {
    return (
        <Box sx={{ width: '100%', maxWidth: 400, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h5" color="white" fontWeight="bold" sx={{ mb: 3 }}>
                EasyOrder Login
            </Typography>
            <SignInPage
                signIn={onSignIn}
                providers={providers}
                slotProps={{
                    emailField: { autoFocus: true },
                    form: { noValidate: false },
                    submitButton: { fullWidth: true }
                }}
                sx={{ minHeight: 'none' }}
            />
            <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                <Link
                    component="button"
                    variant="body2"
                    onClick={onRecoveryClick}
                    sx={{ color: 'primary.main', textDecoration: 'none' }}
                >
                    Forgot Password?
                </Link>
                <Box sx={{ mt: 1 }}>
                    <Button
                        startIcon={<ShieldCheck size={16} />}
                        variant="outlined"
                        size="small"
                        onClick={onRegisterClick}
                        sx={{
                            color: 'gray',
                            borderColor: 'rgba(255,255,255,0.1)',
                            '&:hover': { borderColor: '#FBBF24', color: '#FBBF24' }
                        }}
                    >
                        Register New Staff (Admin Only)
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
