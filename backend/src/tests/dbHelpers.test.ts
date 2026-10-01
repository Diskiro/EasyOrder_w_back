import {
    extractTargetTenantId,
    buildTenantUpdateQuery,
    buildTenantDeleteQuery
} from '../utils/dbHelpers';

describe('Database Helpers & Query Builders (SRP)', () => {
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
});
