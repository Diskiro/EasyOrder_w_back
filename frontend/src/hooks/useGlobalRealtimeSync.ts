import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../lib/socket';
import { useTenant } from '../context/TenantContext';

export interface DbChangePayload {
    table: string;
    restaurant_id?: string | null;
    timestamp?: string;
}

/**
 * SRP: Manejador de invalidación de caché reactiva según la tabla modificada
 */
export function handleTableCacheInvalidation(
    queryClient: ReturnType<typeof useQueryClient>,
    table: string
): void {
    switch (table) {
        case 'orders':
            void queryClient.invalidateQueries({ queryKey: ['orders'] });
            void queryClient.invalidateQueries({ queryKey: ['tables'] });
            void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            break;
        case 'order_items':
            void queryClient.invalidateQueries({ queryKey: ['orders'] });
            void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            break;
        case 'tables':
            void queryClient.invalidateQueries({ queryKey: ['tables'] });
            void queryClient.invalidateQueries({ queryKey: ['orders'] });
            break;
        case 'categories':
            void queryClient.invalidateQueries({ queryKey: ['categories'] });
            break;
        case 'products':
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            break;
        case 'reservations':
            void queryClient.invalidateQueries({ queryKey: ['reservations'] });
            break;
        default:
            break;
    }
}

/**
 * SRP: Hook para gestionar la suscripción y sincronización en tiempo real segmentada por sala de restaurante
 */
export function useGlobalRealtimeSync(tenantIdOverride?: string) {
    const queryClient = useQueryClient();
    const { tenant } = useTenant();
    const effectiveTenantId = tenantIdOverride || tenant?.id;

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const handleConnect = () => {
            if (effectiveTenantId) {
                socket.emit('join_restaurant', { restaurantId: effectiveTenantId });
            }
        };

        // Si ya se encuentra conectado, unirse inmediatamente a la sala
        if (socket.connected && effectiveTenantId) {
            socket.emit('join_restaurant', { restaurantId: effectiveTenantId });
        }

        socket.on('connect', handleConnect);

        const handleDbChange = (payload: DbChangePayload) => {
            if (!payload?.table) return;

            // Filtrado defensivo: si el payload trae restaurant_id y no coincide con el restaurante activo, se descarta
            if (payload.restaurant_id && effectiveTenantId && payload.restaurant_id !== effectiveTenantId) {
                return;
            }

            handleTableCacheInvalidation(queryClient, payload.table);
        };

        socket.on('db_change', handleDbChange);

        return () => {
            if (effectiveTenantId) {
                socket.emit('leave_restaurant', { restaurantId: effectiveTenantId });
            }
            socket.off('connect', handleConnect);
            socket.off('db_change', handleDbChange);
        };
    }, [queryClient, effectiveTenantId]);
}
