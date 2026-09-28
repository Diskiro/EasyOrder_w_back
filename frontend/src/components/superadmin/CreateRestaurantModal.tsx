import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Alert
} from '@mui/material';
import { PlusCircle, Globe } from 'lucide-react';
import { createRestaurant, type SubscriptionPlanRecord, type RestaurantRecord } from '../../lib/superadmin';

interface CreateRestaurantModalProps {
    open: boolean;
    onClose: () => void;
    plans: SubscriptionPlanRecord[];
    onSuccess: (newRestaurant: RestaurantRecord) => void;
}

export const CreateRestaurantModal: React.FC<CreateRestaurantModalProps> = ({
    open,
    onClose,
    plans,
    onSuccess
}) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [planId, setPlanId] = useState(plans[0]?.id || 'basico');
    const [primaryColor, setPrimaryColor] = useState('#FBBF24');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-generar slug al escribir el nombre si el slug no ha sido editado manualmente
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        const generatedSlug = newName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setSlug(generatedSlug);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (name.trim().length < 2) {
            setErrorMessage('El nombre debe tener al menos 2 caracteres.');
            return;
        }

        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
            setErrorMessage('El subdominio/slug solo puede contener letras minúsculas, números y guiones.');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await createRestaurant({
                name: name.trim(),
                slug: slug.trim().toLowerCase(),
                plan_id: planId,
                primary_color: primaryColor,
                phone: phone.trim() || undefined,
                address: address.trim() || undefined
            });

            onSuccess(response.restaurant);
            handleClose();
        } catch (err: any) {
            setErrorMessage(err.message || 'Error al registrar el restaurante.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName('');
        setSlug('');
        setPlanId(plans[0]?.id || 'basico');
        setPrimaryColor('#FBBF24');
        setPhone('');
        setAddress('');
        setErrorMessage(null);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#141619',
                    color: 'white',
                    borderRadius: 3,
                    border: '1px solid #1F2329'
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid #1F2329', fontWeight: 'bold' }}>
                Registrar Nuevo Restaurante (Inquilino)
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    {errorMessage && (
                        <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
                            {errorMessage}
                        </Alert>
                    )}

                    <TextField
                        label="Nombre del Restaurante"
                        value={name}
                        onChange={handleNameChange}
                        required
                        fullWidth
                        placeholder="Ej. Taquería El Pastor"
                        InputLabelProps={{ sx: { color: '#9CA3AF' } }}
                        InputProps={{ sx: { color: 'white', bgcolor: '#1E2228' } }}
                    />

                    <div>
                        <TextField
                            label="Subdominio / Slug Único"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            required
                            fullWidth
                            placeholder="taqueria-el-pastor"
                            InputLabelProps={{ sx: { color: '#9CA3AF' } }}
                            InputProps={{ sx: { color: 'white', bgcolor: '#1E2228' } }}
                        />
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Globe size={13} className="text-[#FBBF24]" />
                            URL de acceso: <span className="text-[#FBBF24] font-mono">https://{slug || 'slug'}.useeasyorder.com</span>
                        </p>
                    </div>

                    <TextField
                        select
                        label="Plan de Suscripción"
                        value={planId}
                        onChange={(e) => setPlanId(e.target.value)}
                        fullWidth
                        InputLabelProps={{ sx: { color: '#9CA3AF' } }}
                        InputProps={{ sx: { color: 'white', bgcolor: '#1E2228' } }}
                    >
                        {plans.map((p) => (
                            <MenuItem key={p.id} value={p.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{p.name}</span>
                                <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>${p.price_monthly}/mes</span>
                            </MenuItem>
                        ))}
                    </TextField>

                    <div className="flex items-center gap-3">
                        <label htmlFor="color-picker-input" className="text-xs text-gray-300 font-semibold cursor-pointer">
                            Color Primario:
                        </label>
                        <input
                            id="color-picker-input"
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-10 h-10 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono text-gray-400">{primaryColor}</span>
                    </div>

                    <TextField
                        label="Teléfono de Contacto"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        fullWidth
                        placeholder="Ej. +52 55 1234 5678"
                        InputLabelProps={{ sx: { color: '#9CA3AF' } }}
                        InputProps={{ sx: { color: 'white', bgcolor: '#1E2228' } }}
                    />

                    <TextField
                        label="Dirección"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Av. Insurgentes Sur 123, CDMX"
                        InputLabelProps={{ sx: { color: '#9CA3AF' } }}
                        InputProps={{ sx: { color: 'white', bgcolor: '#1E2228' } }}
                    />
                </DialogContent>

                <DialogActions sx={{ p: 2.5, borderTop: '1px solid #1F2329' }}>
                    <Button onClick={handleClose} sx={{ color: '#9CA3AF', textTransform: 'none' }}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        startIcon={<PlusCircle size={18} />}
                        sx={{
                            bgcolor: '#FBBF24',
                            color: '#111315',
                            fontWeight: 'bold',
                            textTransform: 'none',
                            px: 3,
                            '&:hover': { bgcolor: '#e5ab1f' }
                        }}
                    >
                        {isSubmitting ? 'Registrando...' : 'Dar de Alta'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
