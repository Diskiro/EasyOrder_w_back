import React from 'react';
import { useTenant } from '../context/TenantContext';
import { AlertCircle, RefreshCw, PhoneCall, ShieldAlert } from 'lucide-react';
import { Button } from '@mui/material';

/**
 * SRP: Componente exclusivo para presentar la pantalla de bloqueo de suscripción vencida o suspendida (HTTP 402).
 */
export const SubscriptionExpiredView: React.FC = () => {
    const { tenant, subscriptionError, refreshTenant, isLoading } = useTenant();

    const isSuspended = subscriptionError?.error === 'subscription_suspended';
    const title = isSuspended ? 'Acceso Suspendido' : 'Suscripción Vencida';
    const message = subscriptionError?.message || (
        isSuspended
            ? 'El acceso para este restaurante ha sido suspendido temporalmente por el administrador.'
            : 'El período de tu plan ha concluido. Por favor renueva tu suscripción para reanudar el servicio.'
    );

    return (
        <div className="fixed inset-0 z-50 bg-[#0E1012] flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="relative mb-6">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl border ${
                    isSuspended
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10'
                }`}>
                    {isSuspended ? <ShieldAlert size={48} /> : <AlertCircle size={48} />}
                </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
                <span className={`text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${
                    isSuspended ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                    EasyOrder • Estado de Cuenta
                </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
                {title}
            </h1>

            <p className="text-gray-300 text-base max-w-lg mb-2 font-medium">
                {tenant?.name || 'Tu Restaurante'}
            </p>

            <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
                {message}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button
                    variant="contained"
                    onClick={() => refreshTenant()}
                    disabled={isLoading}
                    startIcon={<RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />}
                    sx={{
                        bgcolor: '#1F2329',
                        color: 'white',
                        fontWeight: 'bold',
                        textTransform: 'none',
                        px: 3,
                        py: 1.2,
                        borderRadius: 2.5,
                        border: '1px solid #323842',
                        '&:hover': {
                            bgcolor: '#2D333B'
                        }
                    }}
                >
                    {isLoading ? 'Verificando...' : 'Reintentar Verificación'}
                </Button>

                <Button
                    variant="contained"
                    startIcon={<PhoneCall size={18} />}
                    onClick={() => window.open('mailto:soporte@useeasyorder.com', '_blank')}
                    sx={{
                        bgcolor: tenant?.primary_color || '#FBBF24',
                        color: '#111315',
                        fontWeight: 'bold',
                        textTransform: 'none',
                        px: 3,
                        py: 1.2,
                        borderRadius: 2.5,
                        '&:hover': {
                            bgcolor: '#e5ab1f'
                        }
                    }}
                >
                    Contactar a Soporte / Pagos
                </Button>
            </div>

            <p className="text-gray-600 text-xs mt-12">
                Identificador de inquilino: <span className="font-mono text-gray-400">{tenant?.slug || 'demo'}</span>
            </p>
        </div>
    );
};
