import request from 'supertest';
import express from 'express';
import reservationsRouter from '../routes/reservations';
import { pool } from '../config/db';

let mockUser: any = { id: 'host-1', role: 'staff', restaurant_id: 'tenant-res-1' };
let mockTenant: any = { id: 'tenant-res-1' };

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
app.use('/api/reservations', reservationsRouter);

describe('Reservations API & Multi-Tenant Isolation (SRP)', () => {
    beforeEach(() => {
        mockUser = { id: 'host-1', role: 'staff', restaurant_id: 'tenant-res-1' };
        mockTenant = { id: 'tenant-res-1' };
        jest.clearAllMocks();
    });

    describe('GET /api/reservations', () => {
        it('debe obtener reservaciones filtrando por restaurant_id y parámetros opcionales', async () => {
            const mockReservations = [
                {
                    id: 1,
                    customer_name: 'Juan Perez',
                    pax: 4,
                    shift: 'lunch',
                    reservation_time: '2026-10-02T14:00:00Z',
                    restaurant_id: 'tenant-res-1'
                }
            ];
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockReservations });

            const res = await request(app)
                .get('/api/reservations?shift=lunch&startDate=2026-10-02T00:00:00Z&endDate=2026-10-02T23:59:59Z');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockReservations);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('restaurant_id = $1 AND shift = $2 AND reservation_time >= $3 AND reservation_time <= $4'),
                ['tenant-res-1', 'lunch', '2026-10-02T00:00:00Z', '2026-10-02T23:59:59Z']
            );
        });

        it('debe retornar 400 si no se cuenta con un restaurante válido', async () => {
            mockUser = { id: 'anon', role: 'user', restaurant_id: null };
            mockTenant = undefined;

            const res = await request(app).get('/api/reservations');
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/Se requiere un restaurante válido/);
        });
    });

    describe('POST /api/reservations', () => {
        it('debe validar datos obligatorios (nombre, pax, reservation_time)', async () => {
            const res1 = await request(app)
                .post('/api/reservations')
                .send({ customer_name: '', pax: 2, reservation_time: '2026-10-02T20:00:00Z' });
            expect(res1.status).toBe(400);
            expect(res1.body.error).toMatch(/El nombre del cliente es obligatorio/);

            const res2 = await request(app)
                .post('/api/reservations')
                .send({ customer_name: 'Carlos', pax: 0, reservation_time: '2026-10-02T20:00:00Z' });
            expect(res2.status).toBe(400);
            expect(res2.body.error).toMatch(/El número de comensales/);

            const res3 = await request(app)
                .post('/api/reservations')
                .send({ customer_name: 'Carlos', pax: 2, reservation_time: 'fecha-invalida' });
            expect(res3.status).toBe(400);
            expect(res3.body.error).toMatch(/La fecha y hora de la reservación son obligatorias/);
        });

        it('debe crear una reservación asociada al restaurant_id', async () => {
            const createdRes = {
                id: 15,
                customer_name: 'María García',
                pax: 3,
                reservation_time: '2026-10-02T21:00:00Z',
                shift: 'dinner',
                status: 'confirmed',
                restaurant_id: 'tenant-res-1'
            };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdRes] });

            const res = await request(app)
                .post('/api/reservations')
                .send({
                    customer_name: 'María García',
                    pax: 3,
                    reservation_time: '2026-10-02T21:00:00Z',
                    shift: 'dinner',
                    status: 'confirmed'
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe(15);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO reservations'),
                [null, 'María García', 3, '2026-10-02T21:00:00Z', 'dinner', 'confirmed', null, 'tenant-res-1']
            );
        });
    });

    describe('PATCH /api/reservations/:id', () => {
        it('debe actualizar la reservación usando dbHelper aislado', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 15, status: 'seated', restaurant_id: 'tenant-res-1' }]
            });

            const res = await request(app)
                .patch('/api/reservations/15')
                .send({ status: 'seated' });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('seated');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE "reservations" SET "status" = $2 WHERE id = $1 AND restaurant_id = $3'),
                ['15', 'seated', 'tenant-res-1']
            );
        });
    });

    describe('DELETE /api/reservations/:id', () => {
        it('debe eliminar la reservación usando dbHelper aislado', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            const res = await request(app).delete('/api/reservations/15');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: 'ok' });
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM "reservations" WHERE id = $1 AND restaurant_id = $2'),
                ['15', 'tenant-res-1']
            );
        });
    });
});
