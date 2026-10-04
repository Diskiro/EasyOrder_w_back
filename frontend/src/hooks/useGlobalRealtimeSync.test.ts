import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGlobalRealtimeSync, handleTableCacheInvalidation } from './useGlobalRealtimeSync';
import { socket } from '../lib/socket';

const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries
    })
}));

let mockTenantContext: any = { tenant: { id: 'tenant-123', name: 'Demo' } };

vi.mock('../context/TenantContext', () => ({
    useTenant: () => mockTenantContext
}));

vi.mock('../lib/socket', () => {
    const listeners: Record<string, Function[]> = {};
    return {
        socket: {
            connected: false,
            connect: vi.fn(() => {
                socket.connected = true;
                (listeners['connect'] || []).forEach(cb => cb());
            }),
            disconnect: vi.fn(() => {
                socket.connected = false;
            }),
            emit: vi.fn(),
            on: vi.fn((event: string, callback: Function) => {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(callback);
            }),
            off: vi.fn((event: string, callback: Function) => {
                if (listeners[event]) {
                    listeners[event] = listeners[event].filter(cb => cb !== callback);
                }
            }),
            // Helper to trigger events in tests
            __trigger: (event: string, payload?: any) => {
                (listeners[event] || []).forEach(cb => cb(payload));
            }
        }
    };
});

describe('useGlobalRealtimeSync & Socket.IO Tenant Rooms (SRP)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        socket.connected = false;
        mockTenantContext = { tenant: { id: 'tenant-123', name: 'Demo' } };
    });

    describe('handleTableCacheInvalidation', () => {
        it('invalida queries para tabla orders', () => {
            const mockClient: any = { invalidateQueries: vi.fn() };
            handleTableCacheInvalidation(mockClient, 'orders');

            expect(mockClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
            expect(mockClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tables'] });
            expect(mockClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-dashboard'] });
        });

        it('invalida queries para tabla order_items', () => {
            const mockClient: any = { invalidateQueries: vi.fn() };
            handleTableCacheInvalidation(mockClient, 'order_items');

            expect(mockClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
            expect(mockClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-dashboard'] });
        });

        it('invalida queries para tabla categories', () => {
            const mockClient: any = { invalidateQueries: vi.fn() };
            handleTableCacheInvalidation(mockClient, 'categories');

            expect(mockClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['categories'] });
        });

        it('invalida queries para tabla products', () => {
            const mockClient: any = { invalidateQueries: vi.fn() };
            handleTableCacheInvalidation(mockClient, 'products');

            expect(mockClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
        });

        it('invalida queries para tabla reservations', () => {
            const mockClient: any = { invalidateQueries: vi.fn() };
            handleTableCacheInvalidation(mockClient, 'reservations');

            expect(mockClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reservations'] });
        });

        it('ignora tablas no mapeadas sin lanzar error', () => {
            const mockClient: any = { invalidateQueries: vi.fn() };
            expect(() => handleTableCacheInvalidation(mockClient, 'unknown_table')).not.toThrow();
            expect(mockClient.invalidateQueries).not.toHaveBeenCalled();
        });
    });

    describe('useGlobalRealtimeSync Hook', () => {
        it('se conecta a Socket.IO y emite join_restaurant con el tenantId', () => {
            renderHook(() => useGlobalRealtimeSync());

            expect(socket.connect).toHaveBeenCalled();
            expect(socket.emit).toHaveBeenCalledWith('join_restaurant', { restaurantId: 'tenant-123' });
        });

        it('procesa evento db_change correspondiente al tenant', () => {
            renderHook(() => useGlobalRealtimeSync());

            act(() => {
                (socket as any).__trigger('db_change', {
                    table: 'orders',
                    restaurant_id: 'tenant-123'
                });
            });

            expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
        });

        it('descarta eventos db_change pertenecientes a otro restaurante', () => {
            renderHook(() => useGlobalRealtimeSync());

            act(() => {
                (socket as any).__trigger('db_change', {
                    table: 'orders',
                    restaurant_id: 'other-tenant-999'
                });
            });

            expect(mockInvalidateQueries).not.toHaveBeenCalled();
        });

        it('emite leave_restaurant y limpia listeners al desmontar el hook', () => {
            const { unmount } = renderHook(() => useGlobalRealtimeSync());

            unmount();

            expect(socket.emit).toHaveBeenCalledWith('leave_restaurant', { restaurantId: 'tenant-123' });
            expect(socket.off).toHaveBeenCalledWith('db_change', expect.any(Function));
            expect(socket.off).toHaveBeenCalledWith('connect', expect.any(Function));
        });
    });
});
