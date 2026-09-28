import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { TenantProvider, useTenant } from './TenantContext';
import * as api from '../lib/api';

describe('TenantContext (SRP & Subscription State)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
    );

    it('debe cargar los datos del inquilino y habilitar las características del plan', async () => {
        const mockTenant = {
            id: 'uuid-1',
            slug: 'pizzeria-roma',
            name: 'Pizzería Roma',
            plan_id: 'pro',
            status: 'active',
            subscription_expires_at: new Date(Date.now() + 100000000).toISOString(),
            primary_color: '#FF0000',
            features: {
                has_kitchen_display: true,
                has_analytics: true,
                has_reservations: false,
                has_cash_register: true,
                has_qr_ordering: true,
                max_tables: 30,
                max_users: 5
            }
        };

        vi.spyOn(api, 'apiFetch').mockResolvedValue(mockTenant);

        const { result } = renderHook(() => useTenant(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.tenant?.slug).toBe('pizzeria-roma');
        expect(result.current.isFeatureEnabled('has_kitchen_display')).toBe(true);
        expect(result.current.isFeatureEnabled('has_reservations')).toBe(false);
        expect(result.current.isSubscriptionBlocked).toBe(false);
    });

    it('debe marcar la suscripción como bloqueada si el estado es suspended', async () => {
        const mockTenant = {
            id: 'uuid-2',
            slug: 'cafe-demo',
            name: 'Café Demo',
            plan_id: 'basico',
            status: 'suspended',
            subscription_expires_at: new Date(Date.now() + 100000000).toISOString(),
            primary_color: '#FBBF24',
            features: {
                has_kitchen_display: false,
                has_analytics: false,
                has_reservations: false,
                has_cash_register: false,
                has_qr_ordering: true,
                max_tables: 10,
                max_users: 2
            }
        };

        vi.spyOn(api, 'apiFetch').mockResolvedValue(mockTenant);

        const { result } = renderHook(() => useTenant(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isSubscriptionBlocked).toBe(true);
        expect(result.current.subscriptionError?.error).toBe('subscription_suspended');
    });

    it('debe responder reactivamente al evento global subscription_error', async () => {
        vi.spyOn(api, 'apiFetch').mockResolvedValue({
            id: 'uuid-3',
            slug: 'tacos-express',
            name: 'Tacos Express',
            plan_id: 'basico',
            status: 'active',
            subscription_expires_at: new Date(Date.now() + 100000000).toISOString(),
            primary_color: '#FBBF24',
            features: {
                has_kitchen_display: false,
                has_analytics: false,
                has_reservations: false,
                has_cash_register: false,
                has_qr_ordering: true,
                max_tables: 10,
                max_users: 2
            }
        });

        const { result } = renderHook(() => useTenant(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isSubscriptionBlocked).toBe(false);

        act(() => {
            window.dispatchEvent(new CustomEvent('subscription_error', {
                detail: { error: 'subscription_expired', message: 'Suscripción expirada' }
            }));
        });

        expect(result.current.isSubscriptionBlocked).toBe(true);
        expect(result.current.subscriptionError?.error).toBe('subscription_expired');
    });
});
