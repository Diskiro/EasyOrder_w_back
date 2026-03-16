import request from 'supertest';
import express from 'express';
import tablesRouter from '../routes/tables';
import menuRouter from '../routes/menu';
import { pool } from '../config/db';

// Mock DB Pool and the Auth Middleware to bypass login requirements in tests
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn()
    }
}));

jest.mock('../middleware/auth', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'admin-123', role: 'admin' };
        next();
    }
}));

const app = express();
app.use(express.json());
app.use('/api/tables', tablesRouter);
app.use('/api/menu', menuRouter);

describe('Data APIs', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/tables', () => {
        it('should return tables ordered by number', async () => {
            const mockTables = [{ id: 1, number: '1A', status: 'available' }];
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockTables });

            const res = await request(app).get('/api/tables');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockTables);
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM tables'));
        });
    });

    describe('GET /api/menu/products', () => {
        it('should retrieve active products', async () => {
            const mockProducts = [{ id: 1, name: 'Burger', price: 10 }];
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockProducts });

            const res = await request(app).get('/api/menu/products');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockProducts);
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM products'));
        });
    });
});
