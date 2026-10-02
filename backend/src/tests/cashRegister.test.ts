import request from 'supertest';
import express from 'express';
import cashRegisterRouter from '../routes/cash-register';
import { pool } from '../config/db';

let mockUser: any = { id: 'user-caja-1', role: 'cashier', restaurant_id: 'tenant-rest-1' };
let mockTenant: any = { id: 'tenant-rest-1' };

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
app.use('/api/cash-register', cashRegisterRouter);

describe('Cash Register API & Multi-Tenant Isolation (SRP)', () => {
    beforeEach(() => {
        mockUser = { id: 'user-caja-1', role: 'cashier', restaurant_id: 'tenant-rest-1' };
        mockTenant = { id: 'tenant-rest-1' };
        jest.clearAllMocks();
    });

    describe('GET /api/cash-register', () => {
        it('debe obtener la sesión actual filtrando por restaurant_id', async () => {
            const mockSession = {
                id: 'sess-100',
                user_id: 'user-caja-1',
                start_amount: 1500,
                closed_at: null,
                restaurant_id: 'tenant-rest-1'
            };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSession] });

            const res = await request(app).get('/api/cash-register');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockSession);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE restaurant_id = $1'),
                ['tenant-rest-1']
            );
        });

        it('debe retornar 400 si no se identifica un restaurante válido', async () => {
            mockUser = { id: 'anon', role: 'user', restaurant_id: null };
            mockTenant = undefined;

            const res = await request(app).get('/api/cash-register');
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/Se requiere un restaurante válido/);
        });
    });

    describe('POST /api/cash-register/open', () => {
        it('debe validar que startAmount sea un número válido >= 0', async () => {
            const res = await request(app)
                .post('/api/cash-register/open')
                .send({ startAmount: -50 });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/El monto inicial debe ser un número mayor o igual a 0/);
        });

        it('debe impedir abrir caja si ya existe una sesión abierta para el restaurante', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'sess-open' }] });

            const res = await request(app)
                .post('/api/cash-register/open')
                .send({ startAmount: 500 });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Ya hay una caja abierta para este restaurante.');
        });

        it('debe registrar apertura de caja con restaurant_id aislado', async () => {
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] }) // check no open session
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'sess-new',
                        user_id: 'user-caja-1',
                        start_amount: 800,
                        restaurant_id: 'tenant-rest-1'
                    }]
                });

            const res = await request(app)
                .post('/api/cash-register/open')
                .send({ startAmount: 800 });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('sess-new');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO cash_register_sessions'),
                ['user-caja-1', 800, 'tenant-rest-1']
            );
        });
    });

    describe('PATCH /api/cash-register/close/:id', () => {
        it('debe validar que endAmount sea válido', async () => {
            const res = await request(app)
                .patch('/api/cash-register/close/sess-new')
                .send({ endAmount: 'invalido' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/El monto final debe ser un número/);
        });

        it('debe cerrar la sesión verificando restaurant_id', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{
                    id: 'sess-new',
                    end_amount: 1200,
                    notes: 'Cierre de turno normal',
                    closed_at: '2026-10-02T16:00:00Z',
                    restaurant_id: 'tenant-rest-1'
                }]
            });

            const res = await request(app)
                .patch('/api/cash-register/close/sess-new')
                .send({ endAmount: 1200, notes: 'Cierre de turno normal' });

            expect(res.status).toBe(200);
            expect(res.body.end_amount).toBe(1200);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('AND restaurant_id = $4'),
                [1200, 'Cierre de turno normal', 'sess-new', 'tenant-rest-1']
            );
        });

        it('debe retornar 404 si la sesión no existe o pertenece a otro restaurante', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .patch('/api/cash-register/close/sess-other')
                .send({ endAmount: 1200 });

            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/Sesión no encontrada/);
        });
    });
});
