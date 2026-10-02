import request from 'supertest';
import express from 'express';
import analyticsRouter, { getChartStartDays } from '../routes/analytics';
import { pool } from '../config/db';

let mockUser: any = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-abc' };
let mockTenant: any = { id: 'tenant-abc' };

jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn()
    }
}));

jest.mock('../middleware/auth', () => ({
    authenticateToken: (req: any, _res: any, next: any) => {
        req.user = mockUser;
        next();
    }
}));

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
    if (mockTenant) req.tenant = mockTenant;
    next();
});
app.use('/api/analytics', analyticsRouter);

describe('Analytics API & Multi-Tenant Isolation (SRP)', () => {
    beforeEach(() => {
        mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-abc' };
        mockTenant = { id: 'tenant-abc' };
        jest.clearAllMocks();
    });

    describe('getChartStartDays helper', () => {
        it('debe retornar 0 para "day"', () => {
            expect(getChartStartDays('day')).toBe(0);
        });

        it('debe retornar 30 para "month"', () => {
            expect(getChartStartDays('month')).toBe(30);
        });

        it('debe retornar 7 por defecto para week o valores desconocidos', () => {
            expect(getChartStartDays('week')).toBe(7);
            expect(getChartStartDays(undefined)).toBe(7);
            expect(getChartStartDays('invalid')).toBe(7);
        });
    });

    describe('GET /api/analytics/dashboard', () => {
        it('debe aislar todas las métricas filtrando por restaurant_id del tenant', async () => {
            // Mock de las 5 consultas paralelas
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ total_amount: '150.50' }, { total_amount: '50.00' }] }) // todaysOrders
                .mockResolvedValueOnce({ rows: [{ exact_count: '4' }] }) // activeOrders
                .mockResolvedValueOnce({ rows: [{ exact_count: '25' }] }) // products
                .mockResolvedValueOnce({ rows: [{ exact_count: '6' }] }) // staff
                .mockResolvedValueOnce({ rows: [{ total_amount: '200.50', created_at: '2026-10-02' }] }); // chartOrders

            const res = await request(app).get('/api/analytics/dashboard?timeRange=week');

            expect(res.status).toBe(200);
            expect(res.body.stats).toEqual({
                totalSales: 200.50,
                activeOrders: 4,
                totalProducts: 25,
                totalStaff: 6
            });
            expect(res.body.chartOrders).toEqual([
                { total_amount: 200.50, created_at: '2026-10-02' }
            ]);

            // Validar que las consultas incluyeron el parámetro tenant-abc
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('restaurant_id = $1'),
                ['tenant-abc']
            );
        });

        it('debe responder 400 si el usuario no tiene restaurant_id y no es superadmin', async () => {
            mockUser = { id: 'anon-1', role: 'user', restaurant_id: null };
            mockTenant = undefined;

            const res = await request(app).get('/api/analytics/dashboard');

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/Se requiere un restaurante válido/);
        });

        it('debe permitir a superadmin consultar sin filtrar por restaurante', async () => {
            mockUser = { id: 'super-1', role: 'superadmin', restaurant_id: null };
            mockTenant = undefined;

            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ total_amount: '1000' }] })
                .mockResolvedValueOnce({ rows: [{ exact_count: '10' }] })
                .mockResolvedValueOnce({ rows: [{ exact_count: '100' }] })
                .mockResolvedValueOnce({ rows: [{ exact_count: '20' }] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/analytics/dashboard?timeRange=day');

            expect(res.status).toBe(200);
            expect(res.body.stats.totalSales).toBe(1000);
        });
    });
});
