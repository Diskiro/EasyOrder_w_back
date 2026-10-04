import request from 'supertest';
import express from 'express';
import ordersRouter from '../routes/orders';
import { pool } from '../config/db';

let mockUser: any = { id: 'admin-123', role: 'admin', restaurant_id: 'tenant-1' };
let mockTenant: any = { id: 'tenant-1' };

const mockClient = {
    query: jest.fn(),
    release: jest.fn()
};

jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
        connect: jest.fn()
    }
}));

jest.mock('../middleware/auth', () => ({
    authenticateToken: (req: any, _res: any, next: any) => {
        req.user = mockUser;
        next();
    }
}));

const mockIo = {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis()
};

const app = express();
app.use(express.json());
app.set('io', mockIo);
app.use((req: any, _res, next) => {
    if (mockTenant) req.tenant = mockTenant;
    next();
});
app.use('/api/orders', ordersRouter);

describe('Orders API & Multi-Tenant (SRP)', () => {
    beforeEach(() => {
        mockUser = { id: 'admin-123', role: 'admin', restaurant_id: 'tenant-1' };
        mockTenant = { id: 'tenant-1' };
        jest.clearAllMocks();
        (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    it('GET /api/orders/active - debe retornar pedidos activos filtrados por restaurant_id', async () => {
        const mockOrders = [
            { id: 1, table_id: 2, status: 'pending', restaurant_id: 'tenant-1', order_items: [] }
        ];
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockOrders });

        const res = await request(app).get('/api/orders/active');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockOrders);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE o.status != \'completed\''),
            ['tenant-1']
        );
    });

    it('POST /api/orders - debe crear una orden con restaurant_id en una transacción', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 10, table_id: 1, total_amount: 50, restaurant_id: 'tenant-1' }] }) // INSERT orders
            .mockResolvedValueOnce({ rows: [] }) // INSERT order_items
            .mockResolvedValueOnce({ rows: [] }) // UPDATE tables
            .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const res = await request(app)
            .post('/api/orders')
            .send({
                tableId: 1,
                serverId: 'admin-123',
                items: [{ productId: 5, quantity: 2, price: 25, notes: 'Sin cebolla' }]
            });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(10);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
    });

    it('PATCH /api/orders/:orderId/status - debe actualizar estado de orden', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // UPDATE orders
            .mockResolvedValueOnce({ rows: [{ table_id: 1 }] }) // SELECT table_id
            .mockResolvedValueOnce({ rows: [] }) // UPDATE orders table completed
            .mockResolvedValueOnce({ rows: [] }) // UPDATE tables available
            .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const res = await request(app)
            .patch('/api/orders/10/status')
            .send({ status: 'completed' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('PATCH /api/orders/:orderId/items/:itemId/ready - debe marcar item listo', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // UPDATE order_items
            .mockResolvedValueOnce({ rows: [{ is_ready: true }] }) // SELECT is_ready
            .mockResolvedValueOnce({ rows: [] }) // UPDATE orders status ready
            .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const res = await request(app)
            .patch('/api/orders/10/items/55/ready')
            .send({ isReady: true });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('PATCH /api/orders/:orderId/items - debe actualizar lista de items', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 1, product_id: 100, quantity: 1, unit_price: 20 }] }) // SELECT existing
            .mockResolvedValueOnce({ rows: [{ status: 'cooking' }] }) // SELECT order status
            .mockResolvedValueOnce({ rows: [] }) // UPDATE order_items
            .mockResolvedValueOnce({ rows: [] }) // UPDATE orders total
            .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const res = await request(app)
            .patch('/api/orders/10/items')
            .send({
                items: [{ productId: 100, quantity: 2, price: 20, notes: '' }]
            });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
