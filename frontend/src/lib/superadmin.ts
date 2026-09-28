import { apiFetch } from './api';

export interface RestaurantRecord {
    id: string;
    slug: string;
    name: string;
    plan_id: string;
    plan_name?: string;
    price_monthly?: number;
    status: 'active' | 'suspended' | 'past_due';
    subscription_expires_at: string;
    primary_color: string;
    logo_url?: string;
    phone?: string;
    address?: string;
    created_at: string;
}

export interface SubscriptionPlanRecord {
    id: string;
    name: string;
    description: string;
    max_tables: number;
    max_users: number;
    has_kitchen_display: boolean;
    has_analytics: boolean;
    has_reservations: boolean;
    has_cash_register: boolean;
    has_qr_ordering: boolean;
    price_monthly: number;
}

export interface CreateRestaurantPayload {
    name: string;
    slug: string;
    plan_id: string;
    primary_color?: string;
    logo_url?: string;
    phone?: string;
    address?: string;
}

export interface UpdateSubscriptionPayload {
    status?: 'active' | 'suspended' | 'past_due';
    plan_id?: string;
    addDays?: number;
}

/**
 * SRP: Módulo cliente para interactuar exclusivamente con los endpoints de gestión de SuperAdmin
 */
export async function getSuperAdminRestaurants(): Promise<RestaurantRecord[]> {
    return apiFetch('/restaurants/all');
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlanRecord[]> {
    return apiFetch('/restaurants/plans');
}

export async function createRestaurant(payload: CreateRestaurantPayload): Promise<{ message: string; restaurant: RestaurantRecord }> {
    return apiFetch('/restaurants', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export async function updateRestaurantSubscription(
    restaurantId: string,
    payload: UpdateSubscriptionPayload
): Promise<{ message: string; restaurant: RestaurantRecord }> {
    return apiFetch(`/restaurants/${restaurantId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });
}
