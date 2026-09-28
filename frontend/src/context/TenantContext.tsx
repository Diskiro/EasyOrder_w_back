import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../lib/api';

export interface PlanFeatures {
    has_kitchen_display: boolean;
    has_analytics: boolean;
    has_reservations: boolean;
    has_cash_register: boolean;
    has_qr_ordering: boolean;
    max_tables: number;
    max_users: number;
}

export interface TenantData {
    id: string;
    slug: string;
    name: string;
    plan_id: string;
    status: 'active' | 'suspended' | 'past_due';
    subscription_expires_at: string;
    primary_color: string;
    logo_url?: string;
    features: PlanFeatures;
}

export interface TenantContextType {
    tenant: TenantData | null;
    features: PlanFeatures;
    isLoading: boolean;
    isSubscriptionBlocked: boolean;
    subscriptionError: { error: string; message: string } | null;
    isFeatureEnabled: (feature: keyof PlanFeatures) => boolean;
    refreshTenant: () => Promise<void>;
}

const DEFAULT_FEATURES: PlanFeatures = {
    has_kitchen_display: false,
    has_analytics: false,
    has_reservations: false,
    has_cash_register: false,
    has_qr_ordering: true,
    max_tables: 10,
    max_users: 2,
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tenant, setTenant] = useState<TenantData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [subscriptionError, setSubscriptionError] = useState<{ error: string; message: string } | null>(null);

    const refreshTenant = useCallback(async () => {
        try {
            setIsLoading(true);
            const data: TenantData = await apiFetch('/restaurants/current');
            setTenant(data);

            // Verificar si el estado devuelto requiere bloqueo
            if (data.status === 'suspended') {
                setSubscriptionError({
                    error: 'subscription_suspended',
                    message: 'El acceso para este restaurante ha sido suspendido por el administrador.'
                });
            } else if (new Date(data.subscription_expires_at).getTime() < Date.now()) {
                setSubscriptionError({
                    error: 'subscription_expired',
                    message: 'La suscripción del restaurante ha expirado. Por favor contacta al administrador para renovarla.'
                });
            } else {
                setSubscriptionError(null);
            }
        } catch (err: any) {
            if (err.status === 402 || err.code?.startsWith('subscription_')) {
                setSubscriptionError({
                    error: err.code || 'subscription_blocked',
                    message: err.message || 'Suscripción inactiva o suspendida.'
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Escuchar eventos globales de corte de suscripción (HTTP 402)
    useEffect(() => {
        const handleSubscriptionEvent = (event: Event) => {
            const customEvent = event as CustomEvent;
            setSubscriptionError({
                error: customEvent.detail?.error || 'subscription_error',
                message: customEvent.detail?.message || 'Acceso restringido por estado de suscripción.'
            });
        };

        window.addEventListener('subscription_error', handleSubscriptionEvent);
        refreshTenant();

        return () => {
            window.removeEventListener('subscription_error', handleSubscriptionEvent);
        };
    }, [refreshTenant]);

    // Inyectar color primario dinámico en variables CSS del documento
    useEffect(() => {
        if (tenant?.primary_color) {
            document.documentElement.style.setProperty('--tenant-primary-color', tenant.primary_color);
        }
    }, [tenant?.primary_color]);

    const features = useMemo<PlanFeatures>(() => {
        return tenant?.features || DEFAULT_FEATURES;
    }, [tenant?.features]);

    const isFeatureEnabled = useCallback((feature: keyof PlanFeatures): boolean => {
        return Boolean(features[feature]);
    }, [features]);

    const isSubscriptionBlocked = Boolean(subscriptionError);

    const contextValue = useMemo<TenantContextType>(() => ({
        tenant,
        features,
        isLoading,
        isSubscriptionBlocked,
        subscriptionError,
        isFeatureEnabled,
        refreshTenant,
    }), [tenant, features, isLoading, isSubscriptionBlocked, subscriptionError, isFeatureEnabled, refreshTenant]);

    return (
        <TenantContext.Provider value={contextValue}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = (): TenantContextType => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant debe ser utilizado dentro de un TenantProvider');
    }
    return context;
};
