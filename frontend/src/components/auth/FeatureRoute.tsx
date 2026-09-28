import React from 'react';
import { useTenant, type PlanFeatures } from '../../context/TenantContext';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@mui/material';

interface FeatureRouteProps {
    feature: keyof PlanFeatures;
    featureName?: string;
    children: React.ReactNode;
}

const FEATURE_TITLES: Record<keyof PlanFeatures, string> = {
    has_kitchen_display: 'Pantalla de Cocina en Vivo',
    has_analytics: 'Analíticas y Métricas de Ventas',
    has_reservations: 'Gestión de Reservas',
    has_cash_register: 'Control de Caja y Turnos',
    has_qr_ordering: 'Pedidos por Código QR',
    max_tables: 'Límite de Mesas',
    max_users: 'Límite de Personal'
};

/**
 * SRP: Componente guardián que restringe el acceso a vistas según los módulos
 * contratados en la suscripción del restaurante.
 */
export const FeatureRoute: React.FC<FeatureRouteProps> = ({ feature, featureName, children }) => {
    const { isFeatureEnabled, tenant, isLoading } = useTenant();

    if (isLoading) {
        return (
            <div className="flex h-full min-h-[400px] items-center justify-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FBBF24]"></div>
            </div>
        );
    }

    if (!isFeatureEnabled(feature)) {
        const title = featureName || FEATURE_TITLES[feature] || 'Módulo Avanzado';

        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-[#1E2228] border border-[#2D333B] flex items-center justify-center text-[#FBBF24] shadow-2xl shadow-amber-500/10">
                        <Lock size={36} />
                    </div>
                    <div className="absolute -top-1 -right-1 bg-amber-500/20 text-[#FBBF24] p-1.5 rounded-full border border-amber-500/40">
                        <Sparkles size={14} />
                    </div>
                </div>

                <span className="text-xs uppercase tracking-widest font-extrabold text-amber-400/90 mb-2">
                    Módulo No Incluido en tu Plan
                </span>

                <h2 className="text-2xl md:text-3xl font-bold text-white max-w-lg mb-3 tracking-tight">
                    {title}
                </h2>

                <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
                    Tu restaurante <strong className="text-white">({tenant?.name || 'EasyOrder'})</strong> cuenta con el plan <span className="uppercase text-amber-300 font-semibold">{tenant?.plan_id || 'Básico'}</span>. Desbloquea esta función mejorando tu suscripción.
                </p>

                <div className="flex items-center gap-3">
                    <Button
                        variant="contained"
                        sx={{
                            bgcolor: tenant?.primary_color || '#FBBF24',
                            color: '#111315',
                            fontWeight: 'bold',
                            textTransform: 'none',
                            px: 3,
                            py: 1.2,
                            borderRadius: 2.5,
                            boxShadow: '0 4px 20px rgba(251,191,36,0.25)',
                            '&:hover': {
                                bgcolor: '#e5ab1f'
                            }
                        }}
                        endIcon={<ArrowRight size={18} />}
                        onClick={() => window.open('https://useeasyorder.com', '_blank', 'noopener,noreferrer')}
                    >
                        Solicitar Actualización de Plan
                    </Button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
