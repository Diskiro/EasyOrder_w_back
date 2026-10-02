import {
    extractTargetTenantId,
    buildTenantUpdateQuery,
    buildTenantDeleteQuery,
    fetchTenantRecords,
    executeTenantUpdate,
    executeTenantDelete
} from '../utils/dbHelpers';
import { pool } from '../config/db';

jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn()
    }
}));

describe('Database Helpers & Query Builders (SRP)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('extractTargetTenantId', () => {
        it('debe retornar null para superadmin sin tenant específico', () => {
            expect(extractTargetTenantId({ role: 'superadmin' })).toBeNull();
        });

        it('debe retornar tenant id si está definido en contexto para superadmin', () => {
            expect(extractTargetTenantId({ role: 'superadmin' }, { id: 'tenant-1' })).toBe('tenant-1');
        });

        it('debe retornar user restaurant_id si el usuario tiene restaurante', () => {
            expect(extractTargetTenantId({ role: 'admin', restaurant_id: 'rest-100' })).toBe('rest-100');
        });

        it('debe retornar tenant id si el usuario no tiene restaurant_id', () => {
            expect(extractTargetTenantId({ role: 'admin', restaurant_id: null }, { id: 'tenant-xyz' })).toBe('tenant-xyz');
        });
    });

    describe('buildTenantUpdateQuery', () => {
        it('debe retornar null si no hay campos para actualizar', () => {
            expect(buildTenantUpdateQuery('tables', 1, {})).toBeNull();
        });

        it('debe construir consulta UPDATE sin tenantId', () => {
            const res = buildTenantUpdateQuery('tables', 5, { status: 'occupied', capacity: 6 });
            expect(res).not.toBeNull();
            expect(res?.query).toBe('UPDATE "tables" SET "status" = $2, "capacity" = $3 WHERE id = $1 RETURNING *');
            expect(res?.params).toEqual([5, 'occupied', 6]);
        });

        it('debe construir consulta UPDATE con tenantId', () => {
            const res = buildTenantUpdateQuery('products', 'prod-1', { price: 15 }, 'tenant-abc');
            expect(res).not.toBeNull();
            expect(res?.query).toBe('UPDATE "products" SET "price" = $2 WHERE id = $1 AND restaurant_id = $3 RETURNING *');
            expect(res?.params).toEqual(['prod-1', 15, 'tenant-abc']);
        });
    });

    describe('buildTenantDeleteQuery', () => {
        it('debe construir consulta DELETE sin tenantId', () => {
            const res = buildTenantDeleteQuery('categories', 10);
            expect(res.query).toBe('DELETE FROM "categories" WHERE id = $1');
            expect(res.params).toEqual([10]);
        });

        it('debe construir consulta DELETE con tenantId', () => {
            const res = buildTenantDeleteQuery('tables', 'table-2', 'tenant-123');
            expect(res.query).toBe('DELETE FROM "tables" WHERE id = $1 AND restaurant_id = $2');
            expect(res.params).toEqual(['table-2', 'tenant-123']);
        });
    });

    describe('fetchTenantRecords', () => {
        it('debe ejecutar SELECT con tenant y where adicional', async () => {
            const mockRes: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

            await fetchTenantRecords(mockRes, 'categories', 'sort_order ASC', 'tenant-1', 'is_active = true');
            expect(mockRes.json).toHaveBeenCalledWith([{ id: 1 }]);
            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM "categories" WHERE is_active = true AND restaurant_id = $1 ORDER BY sort_order ASC',
                ['tenant-1']
            );
        });

        it('debe manejar errores de base de datos en fetchTenantRecords', async () => {
            const mockRes: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            await fetchTenantRecords(mockRes, 'categories', 'sort_order ASC', null);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'DB Error' });
        });
    });

    describe('executeTenantUpdate', () => {
        it('debe responder 400 si el body está vacío', async () => {
            const mockRes: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            await executeTenantUpdate(mockRes, 'tables', '1', {}, null, 'Not found');
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('debe responder 404 si la consulta retorna 0 filas', async () => {
            const mockRes: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            await executeTenantUpdate(mockRes, 'tables', '1', { number: '10' }, 'tenant-1', 'Mesa no encontrada');
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Mesa no encontrada' });
        });

        it('debe responder con la fila actualizada', async () => {
            const mockRes: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, number: '10' }] });

            await executeTenantUpdate(mockRes, 'tables', '1', { number: '10' }, 'tenant-1', 'Mesa no encontrada');
            expect(mockRes.json).toHaveBeenCalledWith({ id: 1, number: '10' });
        });
    });

    describe('executeTenantDelete', () => {
        it('debe responder 404 si no se eliminó ninguna fila', async () => {
            const mockRes: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

            await executeTenantDelete(mockRes, 'tables', '1', 'tenant-1', 'Mesa no encontrada');
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('debe responder status ok al eliminar', async () => {
            const mockRes: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            await executeTenantDelete(mockRes, 'tables', '1', 'tenant-1', 'Mesa no encontrada');
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok' });
        });
    });
});
