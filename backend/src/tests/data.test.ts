import request from 'supertest';
import express from 'express';
import tablesRouter from '../routes/tables';
import menuRouter from '../routes/menu';
import { pool } from '../config/db';

let mockUser: any = { id: 'admin-123', role: 'admin', restaurant_id: 'tenant-1' };
let mockTenant: any = { id: 'tenant-1', plan: { max_tables: 10 } };

// Mock DB Pool and the Auth Middleware
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
app.use('/api/tables', tablesRouter);
app.use('/api/menu', menuRouter);

describe('Data APIs (Tables & Menu CRUD with Multi-Tenant)', () => {
    beforeEach(() => {
        mockUser = { id: 'admin-123', role: 'admin', restaurant_id: 'tenant-1' };
        mockTenant = { id: 'tenant-1', plan: { max_tables: 10 } };
        jest.clearAllMocks();
    });

    describe('Tables Endpoints', () => {
        it('GET /api/tables - debe retornar mesas filtradas por restaurant_id', async () => {
            const mockTables = [{ id: 1, number: '1A', status: 'available', restaurant_id: 'tenant-1' }];
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockTables });

            const res = await request(app).get('/api/tables');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockTables);
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE restaurant_id = $1'), ['tenant-1']);
        });

        it('POST /api/tables - debe responder 400 si falta el número de mesa', async () => {
            const res = await request(app).post('/api/tables').send({ capacity: 4 });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('número');
        });

        it('POST /api/tables - debe responder 400 si se alcanza la cuota máxima de mesas', async () => {
            mockTenant = { id: 'tenant-1', plan: { max_tables: 2 } };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '2' }] }); // count >= max_tables

            const res = await request(app).post('/api/tables').send({ number: 'Mesa 3', capacity: 4 });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('table_limit_reached');
        });

        it('POST /api/tables - debe crear una mesa exitosamente', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '1' }] });
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 2, number: 'Mesa 2', capacity: 4, status: 'available', restaurant_id: 'tenant-1' }]
            });

            const res = await request(app).post('/api/tables').send({ number: 'Mesa 2', capacity: 4 });
            expect(res.status).toBe(201);
            expect(res.body.number).toBe('Mesa 2');
        });

        it('PATCH /api/tables/:id - debe responder 400 si no se envían campos', async () => {
            const res = await request(app).patch('/api/tables/1').send({});
            expect(res.status).toBe(400);
        });

        it('PATCH /api/tables/:id - debe responder 404 si la mesa no existe o es de otro tenant', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
            const res = await request(app).patch('/api/tables/99').send({ status: 'occupied' });
            expect(res.status).toBe(404);
        });

        it('PATCH /api/tables/:id - debe actualizar mesa exitosamente', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 1, number: '1A', status: 'occupied', restaurant_id: 'tenant-1' }]
            });
            const res = await request(app).patch('/api/tables/1').send({ status: 'occupied' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('occupied');
        });

        it('DELETE /api/tables/:id - debe responder 404 si la mesa no existe', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
            const res = await request(app).delete('/api/tables/99');
            expect(res.status).toBe(404);
        });

        it('DELETE /api/tables/:id - debe eliminar mesa exitosamente', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
            const res = await request(app).delete('/api/tables/1');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('Menu Categories Endpoints', () => {
        it('GET /api/menu/categories - debe listar categorías activas', async () => {
            const mockCats = [{ id: 1, name: 'Bebidas', restaurant_id: 'tenant-1' }];
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockCats });

            const res = await request(app).get('/api/menu/categories');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockCats);
        });

        it('POST /api/menu/categories - debe validar nombre requerido', async () => {
            const res = await request(app).post('/api/menu/categories').send({ type: 'food' });
            expect(res.status).toBe(400);
        });

        it('POST /api/menu/categories - debe crear categoría exitosamente', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 10, name: 'Tacos', type: 'food', restaurant_id: 'tenant-1' }]
            });
            const res = await request(app).post('/api/menu/categories').send({ name: 'Tacos', type: 'food' });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Tacos');
        });

        it('PATCH /api/menu/categories/:id - debe actualizar categoría o responder 404', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 10, name: 'Tacos Al Pastor' }] });
            const res = await request(app).patch('/api/menu/categories/10').send({ name: 'Tacos Al Pastor' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Tacos Al Pastor');
        });

        it('DELETE /api/menu/categories/:id - debe eliminar categoría', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
            const res = await request(app).delete('/api/menu/categories/10');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('Menu Products Endpoints', () => {
        it('GET /api/menu/products - debe recuperar productos del restaurante', async () => {
            const mockProducts = [{ id: 1, name: 'Burger', price: 10, restaurant_id: 'tenant-1' }];
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockProducts });

            const res = await request(app).get('/api/menu/products');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockProducts);
        });

        it('POST /api/menu/products - debe validar nombre obligatorio', async () => {
            const res = await request(app).post('/api/menu/products').send({ price: 15 });
            expect(res.status).toBe(400);
        });

        it('POST /api/menu/products - debe crear producto exitosamente', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 5, name: 'Pizza', price: 120, restaurant_id: 'tenant-1' }]
            });
            const res = await request(app).post('/api/menu/products').send({ name: 'Pizza', price: 120 });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Pizza');
        });

        it('PATCH /api/menu/products/:id - debe actualizar producto', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 5, name: 'Pizza Grande', price: 150 }]
            });
            const res = await request(app).patch('/api/menu/products/5').send({ price: 150 });
            expect(res.status).toBe(200);
            expect(res.body.price).toBe(150);
        });

        it('DELETE /api/menu/products/:id - debe eliminar producto', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
            const res = await request(app).delete('/api/menu/products/5');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });
});
