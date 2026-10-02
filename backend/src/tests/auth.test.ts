import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

    describe('GET /api/auth/me', () => {
        it('debe retornar los datos del usuario actual', async () => {
            mockUser = { id: 'user-me-1', role: 'waiter' };
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 'user-me-1', email: 'me@demo.com', role: 'waiter', full_name: 'Yo Mismo' }]
            });

            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(200);
            expect(res.body.user.email).toBe('me@demo.com');
        });
    });

    describe('POST /api/auth/verify-admin', () => {
        it('debe responder 400 si se envían credenciales con formato inválido', async () => {
            const res = await request(app)
                .post('/api/auth/verify-admin')
                .send({ email: 123, password: null });
            expect(res.status).toBe(400);
        });

        it('debe verificar admin exitosamente con credenciales y generar token temporal', async () => {
            const adminUser = {
                id: 'admin-uuid',
                email: 'admin@demo.com',
                password_hash: '$2b$10$hashed',
                role: 'admin',
                restaurant_id: 'tenant-1'
            };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [adminUser] });
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            mockTenant = { id: 'tenant-1', name: 'Demo' };

            const res = await request(app)
                .post('/api/auth/verify-admin')
                .send({ email: 'admin@demo.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.token).toBeDefined();
            expect(res.body.user.role).toBe('admin');
        });

        it('debe responder 401 si el password de admin es incorrecto', async () => {
            const adminUser = {
                id: 'admin-uuid',
                email: 'admin@demo.com',
                password_hash: '$2b$10$hashed',
                role: 'admin',
                restaurant_id: 'tenant-1'
            };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [adminUser] });
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

            const res = await request(app)
                .post('/api/auth/verify-admin')
                .send({ email: 'admin@demo.com', password: 'wrong' });

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('inválidas');
        });

        it('debe responder 403 si el usuario existe pero no tiene rol de admin ni superadmin', async () => {
            const waiterUser = {
                id: 'waiter-uuid',
                email: 'waiter@demo.com',
                password_hash: '$2b$10$hashed',
                role: 'waiter',
                restaurant_id: 'tenant-1'
            };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [waiterUser] });
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            const res = await request(app)
                .post('/api/auth/verify-admin')
                .send({ email: 'waiter@demo.com', password: 'password123' });

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('Solo administradores');
        });

        it('debe responder 403 si el admin no pertenece al tenant solicitado', async () => {
            const otherAdminUser = {
                id: 'admin-2',
                email: 'admin2@other.com',
                password_hash: '$2b$10$hashed',
                role: 'admin',
                restaurant_id: 'tenant-2'
            };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [otherAdminUser] });
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            mockTenant = { id: 'tenant-1', name: 'Demo 1' };

            const res = await request(app)
                .post('/api/auth/verify-admin')
                .send({ email: 'admin2@other.com', password: 'password123' });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('tenant_forbidden');
        });

        it('debe responder 401 si no se envían credenciales ni token de autorización', async () => {
            const res = await request(app).post('/api/auth/verify-admin');
            expect(res.status).toBe(401);
        });

        it('debe responder status ok si se provee un token JWT de admin válido', async () => {
            const validToken = 'valid-jwt-token';
            jest.spyOn(jwt, 'verify').mockImplementationOnce(((_t: any, _s: any, cb: any) => {
                cb(null, { id: 'admin-1', role: 'admin' });
            }) as any);

            const res = await request(app)
                .post('/api/auth/verify-admin')
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('debe cerrar sesión actualizando is_logged_in a 0', async () => {
            mockUser = { id: 'user-1' };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const res = await request(app).post('/api/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE profiles SET is_logged_in = 0 WHERE id = $1'),
                ['user-1']
            );
        });
    });

    describe('PATCH /api/auth/staff/:id', () => {
        it('debe validar rol antes de actualizar', async () => {
            mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };
            const res = await request(app).patch('/api/auth/staff/user-1').send({ role: 'invalid' });
            expect(res.status).toBe(400);
        });

        it('debe actualizar rol con éxito', async () => {
            mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            const res = await request(app).patch('/api/auth/staff/user-1').send({ role: 'kitchen' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('DELETE /api/auth/staff/:id', () => {
        it('debe impedir que el usuario elimine su propia cuenta', async () => {
            mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };
            const res = await request(app).delete('/api/auth/staff/admin-1');
            expect(res.status).toBe(400);
        });

        it('debe eliminar empleado del mismo restaurante', async () => {
            mockUser = { id: 'admin-1', role: 'admin', restaurant_id: 'tenant-1' };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            const res = await request(app).delete('/api/auth/staff/user-2');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('POST /api/auth/change-password', () => {
        it('debe validar longitud de contraseña mínima', async () => {
            mockUser = { id: 'user-1' };
            const res = await request(app).post('/api/auth/change-password').send({ password: '123' });
            expect(res.status).toBe(400);
        });

        it('debe cambiar la contraseña exitosamente', async () => {
            mockUser = { id: 'user-1' };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const res = await request(app).post('/api/auth/change-password').send({ password: 'newSecurePassword123' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });
});

