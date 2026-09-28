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
import { CalendarPlus, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
    updateRestaurantSubscription,
    type RestaurantRecord,
    type SubscriptionPlanRecord
} from '../../lib/superadmin';

interface SubscriptionActionDialogProps {
    open: boolean;
    restaurant: RestaurantRecord | null;
    plans: SubscriptionPlanRecord[];
    onClose: () => void;
    onSuccess: (updated: RestaurantRecord) => void;
}

export const SubscriptionActionDialog: React.FC<SubscriptionActionDialogProps> = ({
    open,
    restaurant,
    plans,
    onClose,
    onSuccess
}) => {
    const [actionType, setActionType] = useState<'renew' | 'status' | 'plan'>('renew');
    const [addDays, setAddDays] = useState(30);
    const [status, setStatus] = useState<'active' | 'suspended'>('active');
    const [planId, setPlanId] = useState(restaurant?.plan_id || 'basico');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    React.useEffect(() => {
        if (restaurant) {
            setStatus(restaurant.status === 'suspended' ? 'active' : 'suspended');
            setPlanId(restaurant.plan_id);
            setAddDays(30);
            setErrorMessage(null);
        }
    }, [restaurant]);

    if (!restaurant) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        try {
            setIsSubmitting(true);
            const payload: any = {};

            if (actionType === 'renew') {
                payload.addDays = Number(addDays);
            } else if (actionType === 'status') {
                payload.status = status;
            } else if (actionType === 'plan') {
                payload.plan_id = planId;
            }

            const response = await updateRestaurantSubscription(restaurant.id, payload);
            onSuccess(response.restaurant);
            onClose();
        } catch (err: any) {
            setErrorMessage(err.message || 'Error al actualizar suscripción.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
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
                Gestionar Suscripción: {restaurant.name}
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    {errorMessage && (
                        <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
                            {errorMessage}
                        </Alert>
                    )}

                    <div className="flex rounded-lg bg-[#1E2228] p-1 border border-[#2D333B]">
                        <button
                            type="button"
                            onClick={() => setActionType('renew')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                actionType === 'renew' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Renovar Días
                        </button>
                        <button
                            type="button"
                            onClick={() => setActionType('status')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                actionType === 'status' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Estado
                        </button>
                        <button
                            type="button"
                            onClick={() => setActionType('plan')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                actionType === 'plan' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Plan
                        </button>
                    </div>

                    {actionType === 'renew' && (
                        <div>
                            <TextField
                                select
                                label="Extensión de Vigencia"
                                value={addDays}
                                onChange={(e) => setAddDays(Number(e.target.value))}
                                fullWidth
                                InputLabelProps={{ sx: { color: '#9CA3AF' } }}
                                InputProps={{ sx: { color: 'white', bgcolor: '#1E2228' } }}
                            >
                                <MenuItem value={30}>+30 Días (1 Mes)</MenuItem>
                                <MenuItem value={90}>+90 Días (3 Meses)</MenuItem>
                                <MenuItem value={180}>+180 Días (Semestral)</MenuItem>
                                <MenuItem value={365}>+365 Días (1 Año)</MenuItem>
                            </TextField>
                            <p className="text-xs text-gray-400 mt-2">
                                Se sumarán los días a partir de la fecha de corte actual o de hoy si ya estaba vencida.
                            </p>
                        </div>
                    )}

                    {actionType === 'status' && (
                        <div>
                            <TextField
                                select
                                label="Cambiar Estado de la Cuenta"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                fullWidth
                                InputLabelProps={{ sx: { color: '#9CA3AF' } }}
                                InputProps={{ sx: { color: 'white', bgcolor: '#1E2228' } }}
                            >
                                <MenuItem value="active">Activo (Habilitar acceso)</MenuItem>
                                <MenuItem value="suspended">Suspendido (Bloquear por falta de pago)</MenuItem>
                            </TextField>
                            <p className="text-xs text-gray-400 mt-2">
                                Al suspender, los usuarios verán la pantalla de pago requerido al intentar entrar.
                            </p>
                        </div>
                    )}

                    {actionType === 'plan' && (
                        <div>
                            <TextField
                                select
                                label="Seleccionar Nuevo Plan"
                                value={planId}
                                onChange={(e) => setPlanId(e.target.value)}
                                fullWidth
                                InputLabelProps={{ sx: { color: '#9CA3AF' } }}
                                InputProps={{ sx: { color: 'white', bgcolor: '#1E2228' } }}
                            >
                                {plans.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.name} (${p.price_monthly}/mes)
                                    </MenuItem>
                                ))}
                            </TextField>
                            <p className="text-xs text-gray-400 mt-2">
                                Cambia instantáneamente los límites de mesas/usuarios y módulos permitidos.
                            </p>
                        </div>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2.5, borderTop: '1px solid #1F2329' }}>
                    <Button onClick={onClose} sx={{ color: '#9CA3AF', textTransform: 'none' }}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        startIcon={
                            actionType === 'renew' ? (
                                <CalendarPlus size={18} />
                            ) : status === 'active' ? (
                                <ShieldCheck size={18} />
                            ) : (
                                <ShieldAlert size={18} />
                            )
                        }
                        sx={{
                            bgcolor: '#FBBF24',
                            color: '#111315',
                            fontWeight: 'bold',
                            textTransform: 'none',
                            px: 3,
                            '&:hover': { bgcolor: '#e5ab1f' }
                        }}
                    >
                        {isSubmitting ? 'Guardando...' : 'Aplicar Cambio'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
