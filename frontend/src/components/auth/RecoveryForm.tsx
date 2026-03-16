import { Box, Typography, TextField, Button, Alert, Container, IconButton } from '@mui/material'
import { ArrowLeft } from 'lucide-react'
import { useAuthActions } from '../../hooks/useAuthActions'
import { useFormValidation } from '../../hooks/useFormValidation'

interface RecoveryFormProps {
    onBack: () => void
}

export function RecoveryForm({ onBack }: RecoveryFormProps) {
    const { handleRecovery, loading, error, message } = useAuthActions()

    const { values, errors, handleChange, isValid, validateAll } = useFormValidation(
        { email: '' },
        {
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            }
        }
    )

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (validateAll()) {
            await handleRecovery(values.email)
        }
    }

    return (
        <Container maxWidth="xs" sx={{ bgcolor: 'background.paper', p: 4, borderRadius: 2, boxShadow: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
                <IconButton onClick={onBack} sx={{ color: 'gray', mr: 1 }}>
                    <ArrowLeft size={20} />
                </IconButton>
                <Typography variant="h6" color="white">
                    Password Recovery
                </Typography>
            </Box>

            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={onSubmit}>
                <Typography variant="body2" color="gray" mb={3}>
                    Enter your email address and we'll send you a link to reset your password.
                </Typography>
                <TextField
                    label="Email Address"
                    name="email"
                    type="email"
                    fullWidth
                    margin="normal"
                    value={values.email}
                    onChange={handleChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    required
                    autoFocus
                />
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading || !isValid}
                    sx={{ mt: 3, mb: 2, bgcolor: '#FBBF24', color: 'black', '&:hover': { bgcolor: '#F59E0B' } }}
                >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
            </form>
        </Container>
    )
}
