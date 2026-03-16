import request from 'supertest';
import express from 'express';
import authRouter from '../routes/auth';
import { pool } from '../config/db';
import * as authMiddleware from '../middleware/auth';

// Mock DB Pool
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    },
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth API Endpoints', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/login', () => {
        it('should return 401 for invalid credentials (user not found)', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'fake@test.com', password: 'wrong' });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Credenciales inválidas');
        });

        it('should login successfully and return JWT if user is valid and not logged in', async () => {
            const mockUser = {
                id: '123',
                email: 'test@test.com',
                role: 'admin',
                full_name: 'Test Admin',
                is_logged_in: 0,
            };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] }); // Select user
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Update status

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'password123' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toEqual({
                id: '123',
                email: 'test@test.com',
                role: 'admin',
                full_name: 'Test Admin',
            });
            expect(pool.query).toHaveBeenCalledTimes(2);
        });

        it('should reject login if user is already logged in on another device', async () => {
            const mockUser = {
                id: '123',
                is_logged_in: 1, // Already active
            };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'password123' });

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Ya hay una sesión iniciada en otro dispositivo.');
        });
    });
});
