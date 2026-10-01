import request from 'supertest';
import express from 'express';
import { pool } from '../config/db';

let mockTenant: any = null;
let mockUser: any = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };

// Mock DB Pool
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockImplementation((password: string, hash: string) => {
        return Promise.resolve(password === 'password123' && hash === 'hashed_secret');
    }),
    hash: jest.fn().mockResolvedValue('hashed_secret')
}));

// Mock Auth Middleware
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req: any, _res: any, next: any) => {
        req.user = mockUser;
        next();
    }
}));

import authRouter from '../routes/auth';

const app = express();
app.use(express.json());
// Inject mock tenant if present
app.use((req: any, _res, next) => {
    if (mockTenant) req.tenant = mockTenant;
    next();
});
app.use('/api/auth', authRouter);

describe('Auth API Endpoints & Multi-Tenant Isolation', () => {
    beforeEach(() => {
        mockTenant = null;
        mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };
        jest.clearAllMocks();
    });

    describe('POST /api/auth/login', () => {
        it('debe responder 400 si faltan email o contraseña', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: '' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Credenciales inválidas');
        });

        it('debe responder 401 para usuario no encontrado', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'fake@test.com', password: 'password123' });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Credenciales inválidas');
        });

        it('debe responder 401 para contraseña incorrecta', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: '123', email: 'test@test.com', password_hash: 'hashed_secret' }]
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'wrong_password' });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Credenciales inválidas');
        });

        it('debe responder 403 si el usuario pertenece a otro restaurante (Tenant Isolation)', async () => {
            mockTenant = { id: 'tenant-restaurante-2', name: 'Restaurante 2' };

            const userFromRestaurante1 = {
                id: 'user-1',
                email: 'mesero@rest1.com',
                password_hash: 'hashed_secret',
                role: 'waiter',
                restaurant_id: 'tenant-restaurante-1',
                is_logged_in: 0
            };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [userFromRestaurante1] });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'mesero@rest1.com', password: 'password123' });

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('tenant_forbidden');
        });

        it('debe permitir login si el usuario es superadmin aunque el tenant sea diferente', async () => {
            mockTenant = { id: 'tenant-restaurante-2', name: 'Restaurante 2' };

            const superAdminUser = {
                id: 'super-1',
                email: 'super@easyorder.com',
                password_hash: 'hashed_secret',
                role: 'superadmin',
                restaurant_id: null,
                is_logged_in: 0,
                full_name: 'Super Admin'
            };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [superAdminUser] });
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // update is_logged_in

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'super@easyorder.com', password: 'password123' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.role).toBe('superadmin');
        });

        it('debe loguear correctamente y retornar JWT con restaurant_id', async () => {
            mockTenant = { id: 'tenant-demo', name: 'Demo' };

            const validUser = {
                id: '123',
                email: 'admin@demo.com',
                password_hash: 'hashed_secret',
                role: 'admin',
                full_name: 'Demo Admin',
                restaurant_id: 'tenant-demo',
                is_logged_in: 0
            };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [validUser] });
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'admin@demo.com', password: 'password123' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.restaurant_id).toBe('tenant-demo');
        });

        it('debe rechazar login si ya hay sesión activa en otro dispositivo', async () => {
            const user = {
                id: '123',
                email: 'test@test.com',
                password_hash: 'hashed_secret',
                role: 'admin',
                is_logged_in: 1
            };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [user] });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'password123' });

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('sesión iniciada');
        });
    });

    describe('POST /api/auth/register', () => {
        it('debe responder 400 si los datos de entrada son inválidos', async () => {
            mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };

            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'invalid', password: '123', fullName: '', role: 'waiter' });

            expect(response.status).toBe(400);
        });

        it('debe responder 400 si se alcanza la cuota máxima de usuarios del plan', async () => {
            mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };
            mockTenant = { id: 'tenant-1', plan: { max_users: 2 } };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '2' }] }); // count >= max_users

            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'nuevo@demo.com', password: 'password123', fullName: 'Nuevo Mesero', role: 'waiter' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('user_limit_reached');
        });

        it('debe registrar exitosamente un usuario asignando restaurant_id', async () => {
            mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };
            mockTenant = { id: 'tenant-1', plan: { max_users: 10 } };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '1' }] }); // count check
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{
                    id: 'new-user-1',
                    email: 'nuevo@demo.com',
                    full_name: 'Nuevo Mesero',
                    role: 'waiter',
                    restaurant_id: 'tenant-1',
                    created_at: new Date().toISOString()
                }]
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'nuevo@demo.com', password: 'password123', fullName: 'Nuevo Mesero', role: 'waiter' });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('ok');
            expect(response.body.user.restaurant_id).toBe('tenant-1');
        });
    });

    describe('GET /api/auth/staff', () => {
        it('debe listar solo el personal del restaurante del administrador', async () => {
            mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };

            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [
                    { id: 'user-1', email: 'mesero1@demo.com', role: 'waiter', restaurant_id: 'tenant-1' },
                    { id: 'user-2', email: 'cocina1@demo.com', role: 'kitchen', restaurant_id: 'tenant-1' }
                ]
            });

            const response = await request(app).get('/api/auth/staff');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE restaurant_id = $1'),
                ['tenant-1']
            );
        });
    });
});
