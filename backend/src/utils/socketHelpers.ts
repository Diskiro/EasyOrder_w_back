import { Server, Socket } from 'socket.io';

/**
 * SRP: Funciones de utilidad para gestión de salas y emisión segmentada por inquilino en Socket.IO
 */

/**
 * Retorna el identificador de sala para un restaurante/inquilino
 */
export function getTenantRoom(tenantId?: string | null): string {
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
        return 'global';
    }
    return `restaurant:${tenantId.trim()}`;
}

/**
 * Valida si un identificador de inquilino/restaurante es seguro
 */
export function isValidTenantRoomId(id: unknown): id is string {
    if (typeof id !== 'string') return false;
    const trimmed = id.trim();
    return trimmed.length > 0 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Emite un evento db_change exclusivamente a la sala del inquilino correspondiente
 */
export function emitTenantDbChange(
    io: Server | any,
    tenantId: string | null | undefined,
    table: string,
    extraData?: Record<string, any>
): void {
    if (!io || typeof io.emit !== 'function') {
        return;
    }

    const payload = {
        table,
        restaurant_id: tenantId || null,
        timestamp: new Date().toISOString(),
        ...extraData
    };

    if (tenantId && isValidTenantRoomId(tenantId)) {
        const room = getTenantRoom(tenantId);
        if (typeof io.to === 'function') {
            io.to(room).emit('db_change', payload);
            return;
        }
    }

    // Si no hay inquilino definido o es global
    io.emit('db_change', payload);
}

/**
 * Configura los manejadores de eventos y salas para cada conexión Socket.IO
 */
export function setupSocketHandlers(io: Server): void {
    io.on('connection', (socket: Socket) => {
        // Suscripción a la sala de un restaurante específico
        socket.on('join_restaurant', (data: { restaurantId?: string } | string) => {
            const restaurantId = typeof data === 'string' ? data : data?.restaurantId;

            if (isValidTenantRoomId(restaurantId)) {
                const room = getTenantRoom(restaurantId);
                socket.join(room);
                socket.emit('joined_restaurant', { room, status: 'ok' });
            } else {
                socket.emit('error', { message: 'Identificador de restaurante inválido para unirse a la sala.' });
            }
        });

        // Desuscripción de la sala de un restaurante
        socket.on('leave_restaurant', (data: { restaurantId?: string } | string) => {
            const restaurantId = typeof data === 'string' ? data : data?.restaurantId;

            if (isValidTenantRoomId(restaurantId)) {
                const room = getTenantRoom(restaurantId);
                socket.leave(room);
                socket.emit('left_restaurant', { room, status: 'ok' });
            }
        });
    });
}
