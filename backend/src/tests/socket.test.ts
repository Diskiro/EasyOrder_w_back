import {
    getTenantRoom,
    isValidTenantRoomId,
    emitTenantDbChange,
    setupSocketHandlers
} from '../utils/socketHelpers';

describe('Socket.IO Tenant Rooms Helpers & Event Handlers (SRP)', () => {
    describe('getTenantRoom', () => {
        it('debe retornar "restaurant:ID" cuando se provee un tenantId válido', () => {
            expect(getTenantRoom('rest-123')).toBe('restaurant:rest-123');
            expect(getTenantRoom('  demo  ')).toBe('restaurant:demo');
        });

        it('debe retornar "global" cuando tenantId es nulo, indefinido o vacío', () => {
            expect(getTenantRoom(null)).toBe('global');
            expect(getTenantRoom(undefined)).toBe('global');
            expect(getTenantRoom('')).toBe('global');
            expect(getTenantRoom('   ')).toBe('global');
        });
    });

    describe('isValidTenantRoomId', () => {
        it('debe validar identificadores alfanuméricos, uuid y slugs con guiones', () => {
            expect(isValidTenantRoomId('demo-restaurant')).toBe(true);
            expect(isValidTenantRoomId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
            expect(isValidTenantRoomId('rest_123')).toBe(true);
        });

        it('debe rechazar identificadores vacíos, no string o con caracteres inválidos', () => {
            expect(isValidTenantRoomId('')).toBe(false);
            expect(isValidTenantRoomId(null)).toBe(false);
            expect(isValidTenantRoomId(undefined)).toBe(false);
            expect(isValidTenantRoomId(12345)).toBe(false);
            expect(isValidTenantRoomId('rest;drop table')).toBe(false);
            expect(isValidTenantRoomId('rest/123')).toBe(false);
        });
    });

    describe('emitTenantDbChange', () => {
        it('debe emitir a la sala específica cuando se provee tenantId', () => {
            const mockTo = jest.fn().mockReturnThis();
            const mockEmit = jest.fn();
            const mockIo = { to: mockTo, emit: mockEmit };

            emitTenantDbChange(mockIo, 'rest-456', 'orders', { custom: 123 });

            expect(mockTo).toHaveBeenCalledWith('restaurant:rest-456');
            expect(mockEmit).toHaveBeenCalledWith('db_change', expect.objectContaining({
                table: 'orders',
                restaurant_id: 'rest-456',
                custom: 123,
                timestamp: expect.any(String)
            }));
        });

        it('debe emitir broadcast global si no se provee tenantId', () => {
            const mockEmit = jest.fn();
            const mockIo = { emit: mockEmit };

            emitTenantDbChange(mockIo, null, 'tables');

            expect(mockEmit).toHaveBeenCalledWith('db_change', expect.objectContaining({
                table: 'tables',
                restaurant_id: null
            }));
        });

        it('no debe fallar si io es nulo o indefinido', () => {
            expect(() => emitTenantDbChange(null, 'rest-1', 'orders')).not.toThrow();
            expect(() => emitTenantDbChange(undefined, 'rest-1', 'orders')).not.toThrow();
        });
    });

    describe('setupSocketHandlers', () => {
        it('debe registrar el manejador de conexión y permitir unirse a salas', () => {
            const listeners: Record<string, Function> = {};
            const socketListeners: Record<string, Function> = {};

            const mockSocket = {
                id: 'socket-abc',
                join: jest.fn(),
                leave: jest.fn(),
                emit: jest.fn(),
                on: jest.fn((event: string, callback: Function) => {
                    socketListeners[event] = callback;
                })
            };

            const mockIo: any = {
                on: jest.fn((event: string, callback: Function) => {
                    listeners[event] = callback;
                })
            };

            setupSocketHandlers(mockIo);
            expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));

            // Simular conexión
            listeners['connection'](mockSocket);

            // Probar join_restaurant con objeto
            socketListeners['join_restaurant']({ restaurantId: 'tenant-99' });
            expect(mockSocket.join).toHaveBeenCalledWith('restaurant:tenant-99');
            expect(mockSocket.emit).toHaveBeenCalledWith('joined_restaurant', {
                room: 'restaurant:tenant-99',
                status: 'ok'
            });

            // Probar join_restaurant con string directo
            socketListeners['join_restaurant']('tenant-100');
            expect(mockSocket.join).toHaveBeenCalledWith('restaurant:tenant-100');

            // Probar join_restaurant con id inválido
            socketListeners['join_restaurant']({ restaurantId: 'invalid;id' });
            expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
                message: expect.stringMatching(/Identificador de restaurante inválido/)
            }));

            // Probar leave_restaurant
            socketListeners['leave_restaurant']({ restaurantId: 'tenant-99' });
            expect(mockSocket.leave).toHaveBeenCalledWith('restaurant:tenant-99');
            expect(mockSocket.emit).toHaveBeenCalledWith('left_restaurant', {
                room: 'restaurant:tenant-99',
                status: 'ok'
            });
        });
    });
});
