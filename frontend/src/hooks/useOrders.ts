import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { Table } from './useTables';
import type { Product } from './useMenu';

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    is_ready?: boolean;
    notes?: string;
    product?: Product;
}

export interface Order {
    id: number;
    table_id: number;
    server_id: string;
    status: 'pending' | 'cooking' | 'ready' | 'delivered' | 'completed' | 'cancelled';
    total_amount: number;
    created_at: string;
    table?: Table;
    order_items?: OrderItem[];
}

export function useActiveOrders() {
    return useQuery({
        queryKey: ['orders', 'active'],
        queryFn: async () => {
            return await apiFetch('/orders/active') as Order[];
        }
    });
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, status }: { orderId: number, status: Order['status'] }) => {
            return await apiFetch(`/orders/${orderId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        }
    });
}

export function useUpdateOrderItems() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, items }: { orderId: number, items: { productId: number, quantity: number, price: number, notes?: string }[] }) => {
            return await apiFetch(`/orders/${orderId}/items`, {
                method: 'PATCH',
                body: JSON.stringify({ items })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        }
    });
}

export function useUpdateOrderItemReady() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ itemId, isReady, orderId }: { itemId: number, isReady: boolean, orderId: number }) => {
            return await apiFetch(`/orders/${orderId}/items/${itemId}/ready`, {
                method: 'PATCH',
                body: JSON.stringify({ isReady })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        }
    });
}

export function useOrderMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ tableId, serverId, items }: { tableId: number, serverId: string, items: { productId: number, quantity: number, price: number, notes?: string }[] }) => {
            return await apiFetch('/orders', {
                method: 'POST',
                body: JSON.stringify({ tableId, serverId, items })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
    });
}
