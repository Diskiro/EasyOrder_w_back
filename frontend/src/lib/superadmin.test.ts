import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getSuperAdminRestaurants,
    getSubscriptionPlans,
    createRestaurant,
    updateRestaurantSubscription
} from './superadmin';
import * as api from './api';

describe('superadmin client module (SRP & Security)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debe solicitar la lista de todos los restaurantes vía GET /restaurants/all', async () => {
        const mockList = [{ id: '1', name: 'Demo', slug: 'demo' }];
        const spy = vi.spyOn(api, 'apiFetch').mockResolvedValue(mockList);

        const result = await getSuperAdminRestaurants();
        expect(spy).toHaveBeenCalledWith('/restaurants/all');
        expect(result).toEqual(mockList);
    });

    it('debe solicitar los planes disponibles vía GET /restaurants/plans', async () => {
        const mockPlans = [{ id: 'basico', name: 'Plan Básico' }];
        const spy = vi.spyOn(api, 'apiFetch').mockResolvedValue(mockPlans);

        const result = await getSubscriptionPlans();
        expect(spy).toHaveBeenCalledWith('/restaurants/plans');
        expect(result).toEqual(mockPlans);
    });

    it('debe enviar payload para crear restaurante vía POST /restaurants', async () => {
        const payload = {
            name: 'Pizzería Bella',
            slug: 'pizzeria-bella',
            plan_id: 'pro'
        };
        const mockResponse = { message: 'ok', restaurant: { id: '2', ...payload } };
        const spy = vi.spyOn(api, 'apiFetch').mockResolvedValue(mockResponse);

        const result = await createRestaurant(payload);
        expect(spy).toHaveBeenCalledWith('/restaurants', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        expect(result).toEqual(mockResponse);
    });

    it('debe enviar payload de suscripción vía PATCH /restaurants/:id/subscription', async () => {
        const payload = { addDays: 30, status: 'active' as const };
        const mockResponse = { message: 'updated', restaurant: { id: '3', status: 'active' } };
        const spy = vi.spyOn(api, 'apiFetch').mockResolvedValue(mockResponse);

        const result = await updateRestaurantSubscription('rest-123', payload);
        expect(spy).toHaveBeenCalledWith('/restaurants/rest-123/subscription', {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        expect(result).toEqual(mockResponse);
    });
});
