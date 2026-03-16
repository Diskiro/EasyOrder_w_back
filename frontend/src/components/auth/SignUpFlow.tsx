import { useState } from 'react'
import { Box, Typography, TextField, Button, Alert, Container, IconButton } from '@mui/material'
import { ArrowLeft } from 'lucide-react'
import { useAuthActions } from '../../hooks/useAuthActions'
import { useFormValidation } from '../../hooks/useFormValidation'

interface SignUpFlowProps {
    onBack: () => void
}

export function SignUpFlow({ onBack }: SignUpFlowProps) {
    const { handleVerifyAdmin, handleSecureSignUp, loading, error } = useAuthActions()

    // SignUp Steps: 'admin-auth' | 'create-user'
    const [signupStep, setSignupStep] = useState<'admin-auth' | 'create-user'>('admin-auth')

    // Admin Auth Validation
    const adminForm = useFormValidation(
        { adminEmail: '', adminPassword: '' },
        {
            adminEmail: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
            adminPassword: { required: true }
        }
    )

    // New User Validation
    const userForm = useFormValidation(
        { fullName: '', signupEmail: '', signupPassword: '' },
        {
            fullName: { required: true },
            signupEmail: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
            signupPassword: { required: true, minLength: 6 }
        }
    )

    const onAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (adminForm.validateAll()) {
            const success = await handleVerifyAdmin(adminForm.values.adminEmail, adminForm.values.adminPassword)
            if (success) {
                setSignupStep('create-user')
            }
        }
    }

    const onUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (userForm.validateAll()) {
            const success = await handleSecureSignUp(
                userForm.values.signupEmail,
                userForm.values.signupPassword,
                userForm.values.fullName
            )
            if (success) {
                onBack()
            }
        }
    }

    return (
        <Container maxWidth="xs" sx={{ bgcolor: 'background.paper', p: 4, borderRadius: 2, boxShadow: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
                <IconButton onClick={() => {
                    if (signupStep === 'create-user') setSignupStep('admin-auth')
                    else onBack()
                }} sx={{ color: 'gray', mr: 1 }}>
                    <ArrowLeft size={20} />
                </IconButton>
                <Typography variant="h6" color="white">
                    {signupStep === 'admin-auth' ? 'Admin Authorization' : 'New Staff Details'}
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {signupStep === 'admin-auth' ? (
                <form onSubmit={onAdminSubmit}>
                    <Typography variant="body2" color="gray" mb={3}>
                        Please enter Administrator credentials to authorize a new user registration.
                    </Typography>
                    <TextField
                        name="adminEmail"
                        label="Admin Email"
                        type="email"
                        fullWidth
                        margin="normal"
                        value={adminForm.values.adminEmail}
                        onChange={adminForm.handleChange}
                        error={!!adminForm.errors.adminEmail}
                        helperText={adminForm.errors.adminEmail}
                        required
                        autoFocus
                    />
                    <TextField
                        name="adminPassword"
                        label="Admin Password"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={adminForm.values.adminPassword}
                        onChange={adminForm.handleChange}
                        error={!!adminForm.errors.adminPassword}
                        helperText={adminForm.errors.adminPassword}
                        required
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading || !adminForm.isValid}
                        sx={{ mt: 3, mb: 2, bgcolor: '#FBBF24', color: 'black', '&:hover': { bgcolor: '#F59E0B' } }}
                    >
                        {loading ? 'Verifying...' : 'Verify Admin'}
                    </Button>
                </form>
            ) : (
                <form onSubmit={onUserSubmit}>
                    <TextField
                        name="fullName"
                        label="Full Name"
                        fullWidth
                        margin="normal"
                        value={userForm.values.fullName}
                        onChange={userForm.handleChange}
                        error={!!userForm.errors.fullName}
                        helperText={userForm.errors.fullName}
                        required
                        autoFocus
                    />
                    <TextField
                        name="signupEmail"
                        label="New Staff Email"
                        type="email"
                        fullWidth
                        margin="normal"
                        value={userForm.values.signupEmail}
                        onChange={userForm.handleChange}
                        error={!!userForm.errors.signupEmail}
                        helperText={userForm.errors.signupEmail}
                        required
                    />
                    <TextField
                        name="signupPassword"
                        label="New Staff Password"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={userForm.values.signupPassword}
                        onChange={userForm.handleChange}
                        error={!!userForm.errors.signupPassword}
                        helperText={userForm.errors.signupPassword}
                        required
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading || !userForm.isValid}
                        sx={{ mt: 3, mb: 2, bgcolor: '#FBBF24', color: 'black', '&:hover': { bgcolor: '#F59E0B' } }}
                    >
                        {loading ? 'Creating User...' : 'Create User'}
                    </Button>
                </form>
            )}
        </Container>
    )
}
