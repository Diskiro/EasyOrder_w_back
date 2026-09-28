import request from 'supertest';
import express from 'express';
import restaurantsRouter from '../routes/restaurants';
import { pool } from '../config/db';
import { TenantRequest } from '../middleware/tenant';

// Mock DB Pool
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    },
}));

// Mock authenticateToken middleware
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        // Usa el usuario ya inyectado en el test si existe
        if (!req.user) {
            req.user = { id: 'user-1', role: 'admin' };
        }
        next();
    }
}));

describe('Restaurants API Endpoints (SRP & Multi-Tenant)', () => {
    let app: express.Express;
    let mockReqTenant: any = null;
    let mockReqUser: any = null;

    beforeEach(() => {
        app = express();
        app.use(express.json());

        // Inyectar contexto tenant y user controlado en tests
        app.use((req: TenantRequest, res, next) => {
            if (mockReqTenant) {
                req.tenant = mockReqTenant;
            }
            if (mockReqUser) {
                req.user = mockReqUser;
            }
            next();
        });

        app.use('/api/restaurants', restaurantsRouter);
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockReqTenant = null;
        mockReqUser = null;
    });

    describe('GET /api/restaurants/current', () => {
        it('debe devolver 404 si no hay restaurante resuelto en el contexto', async () => {
            mockReqTenant = null;

            const response = await request(app).get('/api/restaurants/current');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No se identificó ningún restaurante activo.');
        });

        it('debe retornar la configuración pública y características del restaurante identificado', async () => {
            mockReqTenant = {
                id: 'rest-uuid-1',
                slug: 'restauranteuno',
                name: 'Restaurante Uno',
                plan_id: 'pro',
                status: 'active',
                subscription_expires_at: '2026-12-31T00:00:00Z',
                primary_color: '#FBBF24',
                logo_url: 'https://example.com/logo.png',
                plan: {
                    has_kitchen_display: true,
                    has_analytics: true,
                    has_reservations: true,
                    has_cash_register: true,
                    has_qr_ordering: true,
                    max_tables: 30,
                    max_users: 8
                }
            };

            const response = await request(app).get('/api/restaurants/current');
            expect(response.status).toBe(200);
            expect(response.body.slug).toBe('restauranteuno');
            expect(response.body.features.has_kitchen_display).toBe(true);
        });

        it('debe responder 500 si ocurre una excepción inesperada al serializar', async () => {
            mockReqTenant = {
                get id() {
                    throw new Error('Unexpected serialization fault');
                }
            };

            const response = await request(app).get('/api/restaurants/current');
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Error al consultar datos del restaurante');
        });
    });

    describe('GET /api/restaurants/all', () => {
        it('debe responder 403 si el rol no es superadmin ni admin', async () => {
            mockReqUser = { id: 'waiter-1', role: 'waiter' };

            const response = await request(app).get('/api/restaurants/all');
            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Acceso reservado para el SuperAdmin.');
        });

        it('debe retornar la lista completa de restaurantes si el rol es admin o superadmin', async () => {
            mockReqUser = { id: 'admin-1', role: 'superadmin' };

            const mockRestaurants = [
                { id: '1', slug: 'demo', name: 'Demo', plan_name: 'Plan Empresarial', price_monthly: 999 },
                { id: '2', slug: 'taqueria', name: 'Taquería', plan_name: 'Plan Profesional', price_monthly: 599 }
            ];

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRestaurants });

            const response = await request(app).get('/api/restaurants/all');
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].slug).toBe('demo');
        });

        it('debe responder 500 en caso de error en la consulta de base de datos', async () => {
            mockReqUser = { id: 'admin-1', role: 'admin' };
            (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB failure'));

            const response = await request(app).get('/api/restaurants/all');
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Error al obtener la lista de restaurantes');
        });
    });

    describe('PATCH /api/restaurants/:id/subscription', () => {
        it('debe responder 403 si el usuario no tiene permisos de administración', async () => {
            mockReqUser = { id: 'chef-1', role: 'kitchen' };

            const response = await request(app)
                .patch('/api/restaurants/rest-1/subscription')
                .send({ status: 'suspended' });

            expect(response.status).toBe(403);
        });

        it('debe responder 400 si no se envían campos válidos para actualizar', async () => {
            mockReqUser = { id: 'admin-1', role: 'admin' };

            const response = await request(app)
                .patch('/api/restaurants/rest-1/subscription')
                .send({ invalid_field: 'algo' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('No se enviaron campos válidos para actualizar.');
        });

        it('debe responder 404 si el restaurante especificado no existe', async () => {
            mockReqUser = { id: 'admin-1', role: 'admin' };
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .patch('/api/restaurants/rest-non-existent/subscription')
                .send({ status: 'suspended' });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Restaurante no encontrado.');
        });

        it('debe actualizar exitosamente el estado, plan y sumar días de vigencia', async () => {
            mockReqUser = { id: 'admin-1', role: 'superadmin' };

            const updatedRow = {
                id: 'rest-1',
                slug: 'demo',
                status: 'active',
                plan_id: 'enterprise',
                subscription_expires_at: '2027-02-01T00:00:00Z'
            };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

            const response = await request(app)
                .patch('/api/restaurants/rest-1/subscription')
                .send({ status: 'active', plan_id: 'enterprise', addDays: 30 });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Suscripción actualizada correctamente');
            expect(response.body.restaurant.status).toBe('active');
        });

        it('debe responder 500 si falla la actualización en base de datos', async () => {
            mockReqUser = { id: 'admin-1', role: 'admin' };
            (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Update failed'));

            const response = await request(app)
                .patch('/api/restaurants/rest-1/subscription')
                .send({ status: 'suspended' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Error al actualizar la suscripción');
        });
    });

    describe('GET /api/restaurants/plans', () => {
        it('debe retornar el catálogo de planes ordenado', async () => {
            const mockPlans = [
                { id: 'basico', name: 'Plan Básico', price_monthly: 299 },
                { id: 'pro', name: 'Plan Profesional', price_monthly: 599 }
            ];

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockPlans });

            const response = await request(app).get('/api/restaurants/plans');
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].id).toBe('basico');
        });

        it('debe responder 500 si ocurre error al consultar los planes', async () => {
            (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

            const response = await request(app).get('/api/restaurants/plans');
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Error al consultar planes de suscripción');
        });
    });

    describe('POST /api/restaurants', () => {
        it('debe responder 403 si el rol no es superadmin ni admin', async () => {
            mockReqUser = { id: 'user-1', role: 'waiter' };

            const response = await request(app)
                .post('/api/restaurants')
                .send({ name: 'Nuevo Rest', slug: 'nuevo-rest' });

            expect(response.status).toBe(403);
        });

        it('debe responder 400 si el nombre es inválido o menor a 2 caracteres', async () => {
            mockReqUser = { id: 'admin-1', role: 'superadmin' };

            const response = await request(app)
                .post('/api/restaurants')
                .send({ name: ' ', slug: 'nuevo-rest' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('nombre');
        });

        it('debe responder 400 si el slug es inválido o reservado', async () => {
            mockReqUser = { id: 'admin-1', role: 'superadmin' };

            const resReserved = await request(app)
                .post('/api/restaurants')
                .send({ name: 'Admin Hub', slug: 'admin' });
            expect(resReserved.status).toBe(400);

            const resInvalidChars = await request(app)
                .post('/api/restaurants')
                .send({ name: 'Restaurante', slug: 'tacos;DROP' });
            expect(resInvalidChars.status).toBe(400);

            const resNoSlug = await request(app)
                .post('/api/restaurants')
                .send({ name: 'Restaurante', slug: '' });
            expect(resNoSlug.status).toBe(400);
        });

        it('debe responder 409 si el slug ya existe', async () => {
            mockReqUser = { id: 'admin-1', role: 'superadmin' };

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] });

            const response = await request(app)
                .post('/api/restaurants')
                .send({ name: 'Taquería Existente', slug: 'taqueria-demo' });

            expect(response.status).toBe(409);
            expect(response.body.error).toContain('ya se encuentra registrado');
        });

        it('debe registrar exitosamente el restaurante con valores válidos', async () => {
            mockReqUser = { id: 'admin-1', role: 'superadmin' };

            const createdRow = {
                id: 'new-uuid',
                name: 'Pizzería Bella',
                slug: 'pizzeria-bella',
                plan_id: 'pro',
                status: 'active'
            };

            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] }) // Verificación de slug existente
                .mockResolvedValueOnce({ rows: [createdRow] }); // Inserción exitosa

            const response = await request(app)
                .post('/api/restaurants')
                .send({
                    name: 'Pizzería Bella',
                    slug: 'pizzeria-bella',
                    plan_id: 'pro',
                    primary_color: '#E11D48'
                });

            expect(response.status).toBe(201);
            expect(response.body.restaurant.slug).toBe('pizzeria-bella');
        });

        it('debe responder 500 en caso de fallo inesperado de base de datos', async () => {
            mockReqUser = { id: 'admin-1', role: 'superadmin' };

            (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Insert failed'));

            const response = await request(app)
                .post('/api/restaurants')
                .send({ name: 'Rest', slug: 'rest-valido' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Error al registrar el nuevo restaurante');
        });
    });
});
