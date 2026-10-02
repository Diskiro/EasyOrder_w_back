import { extractRestaurantSlug, resolveTenant, mapRowToTenant, TenantRequest } from '../middleware/tenant';
import { isSubscriptionValid, requireActiveSubscription } from '../middleware/subscription';
import { hasFeatureEnabled, requireFeature } from '../middleware/featureGate';
import { pool } from '../config/db';
import { Response, NextFunction } from 'express';

// Mock DB Pool
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe('Multi-Tenant & Subscription Architecture (SRP & Security)', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('1. Extracción de Subdominio e Identificador (extractRestaurantSlug)', () => {
        it('debe extraer el slug desde el header X-Restaurant-Slug prioritariamente', () => {
            const slug = extractRestaurantSlug('useeasyorder.com', 'taqueria-central');
            expect(slug).toBe('taqueria-central');
        });

        it('debe limpiar mayúsculas y espacios en el header', () => {
            const slug = extractRestaurantSlug('useeasyorder.com', '  La-Pizzeria  ');
            expect(slug).toBe('la-pizzeria');
        });

        it('debe rechazar caracteres maliciosos o no alfanuméricos en el slug', () => {
            expect(extractRestaurantSlug('useeasyorder.com', 'taqueria;DROP TABLE--')).toBeNull();
            expect(extractRestaurantSlug('useeasyorder.com', '<script>alert(1)</script>')).toBeNull();
        });

        it('debe extraer el subdominio de un hostname válido de producción', () => {
            const slug = extractRestaurantSlug('restauranteuno.useeasyorder.com', undefined);
            expect(slug).toBe('restauranteuno');
        });

        it('debe ignorar subdominios reservados de infraestructura (api, admin, www)', () => {
            expect(extractRestaurantSlug('api.useeasyorder.com', undefined)).toBeNull();
            expect(extractRestaurantSlug('www.useeasyorder.com', undefined)).toBeNull();
            expect(extractRestaurantSlug('app.useeasyorder.com', undefined)).toBeNull();
        });

        it('debe retornar null cuando se accede desde localhost sin subdominio', () => {
            expect(extractRestaurantSlug('localhost', undefined)).toBeNull();
        });
    });

    describe('2. Transformación de Inquilino (mapRowToTenant)', () => {
        it('debe mapear correctamente los campos de base de datos a TenantInfo', () => {
            const row = {
                id: '123-uuid',
                slug: 'tacos-el-pastor',
                name: 'Tacos El Pastor',
                plan_id: 'pro',
                status: 'active',
                subscription_expires_at: '2026-12-31T23:59:59Z',
                primary_color: '#FF5733',
                logo_url: 'https://example.com/logo.png',
                has_kitchen_display: 1,
                has_analytics: true,
                has_reservations: false,
                has_cash_register: true,
                has_qr_ordering: true,
                max_tables: 25,
                max_users: 5
            };

            const tenant = mapRowToTenant(row);
            expect(tenant.id).toBe('123-uuid');
            expect(tenant.slug).toBe('tacos-el-pastor');
            expect(tenant.plan.has_kitchen_display).toBe(true);
            expect(tenant.plan.has_reservations).toBe(false);
            expect(tenant.plan.max_tables).toBe(25);
            expect(tenant.plan.max_users).toBe(5);
        });

        it('debe manejar valores nulos o faltantes en el mapeo con valores seguros por defecto', () => {
            const row = {
                id: '456-uuid',
                slug: 'cafe-central',
                name: 'Café Central',
                plan_id: 'basico',
                status: 'active',
                subscription_expires_at: '2026-10-01T00:00:00Z',
                primary_color: '#000000',
                logo_url: null,
                has_kitchen_display: null,
                has_analytics: null,
                has_reservations: null,
                has_cash_register: null,
                has_qr_ordering: null,
                max_tables: null,
                max_users: null
            };

            const tenant = mapRowToTenant(row);
            expect(tenant.plan.has_kitchen_display).toBe(false);
            expect(tenant.plan.max_tables).toBe(0);
            expect(tenant.plan.max_users).toBe(0);
        });
    });

    describe('3. Middleware resolveTenant', () => {
        const createMockRes = () => {
            const res: Partial<Response> = {};
            res.status = jest.fn().mockReturnValue(res);
            res.json = jest.fn().mockReturnValue(res);
            return res as Response;
        };

        it('debe pasar next() con tenant undefined cuando no se envía subdominio ni header (dominio raíz)', async () => {
            const req = {
                hostname: 'useeasyorder.com',
                headers: {}
            } as unknown as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            await resolveTenant(req, res, next);
            expect(pool.query).not.toHaveBeenCalled();
            expect(req.tenant).toBeUndefined();
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('debe resolver el inquilino cuando se provee el header o subdominio válido', async () => {
            const req = {
                hostname: 'demo.useeasyorder.com',
                headers: { 'x-restaurant-slug': 'demo' }
            } as unknown as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{
                    id: 'demo-uuid',
                    slug: 'demo',
                    name: 'Restaurante Demo',
                    plan_id: 'enterprise',
                    status: 'active',
                    subscription_expires_at: '2027-01-01T00:00:00Z',
                    primary_color: '#FBBF24',
                    has_kitchen_display: true,
                    has_analytics: true,
                    has_reservations: true,
                    has_cash_register: true,
                    has_qr_ordering: true,
                    max_tables: 999,
                    max_users: 999
                }]
            });

            await resolveTenant(req, res, next);
            expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['demo']);
            expect(req.tenant).toBeDefined();
            expect(req.tenant?.slug).toBe('demo');
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('debe responder 404 si el subdominio especificado no existe en la base de datos', async () => {
            const req = {
                hostname: 'noexiste.useeasyorder.com',
                headers: {}
            } as unknown as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            await resolveTenant(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'restaurant_not_found' }));
            expect(next).not.toHaveBeenCalled();
        });

        it('debe manejar errores de base de datos al buscar slug respondiendo 500', async () => {
            const req = {
                hostname: 'demo.useeasyorder.com',
                headers: {}
            } as unknown as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Connection Lost'));

            await resolveTenant(req, res, next);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Error interno al identificar el restaurante' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('4. Validación de Vigencia de Suscripción (isSubscriptionValid)', () => {
        const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 15); // +15 días
        const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 1); // -1 día

        it('debe validar como correcta una suscripción activa con fecha futura', () => {
            const result = isSubscriptionValid('active', futureDate.toISOString());
            expect(result.valid).toBe(true);
        });

        it('debe bloquear una suscripción con status suspended', () => {
            const result = isSubscriptionValid('suspended', futureDate.toISOString());
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('suspended');
        });

        it('debe bloquear una suscripción cuya fecha de corte ya pasó', () => {
            const result = isSubscriptionValid('active', pastDate.toISOString());
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('expired');
        });

        it('debe manejar datos ausentes o inválidos', () => {
            expect(isSubscriptionValid(undefined, undefined).valid).toBe(false);
            expect(isSubscriptionValid('active', 'not-a-valid-date').valid).toBe(false);
        });
    });

    describe('5. Middleware requireActiveSubscription', () => {
        const createMockRes = () => {
            const res: Partial<Response> = {};
            res.status = jest.fn().mockReturnValue(res);
            res.json = jest.fn().mockReturnValue(res);
            return res as Response;
        };

        it('debe llamar a next() si no hay tenant adjunto (rutas públicas o globales)', () => {
            const req = {} as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            requireActiveSubscription(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('debe llamar a next() si el tenant tiene suscripción activa y vigente', () => {
            const req = {
                tenant: {
                    status: 'active',
                    subscription_expires_at: new Date(Date.now() + 1000000).toISOString()
                }
            } as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            requireActiveSubscription(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('debe responder 402 si el tenant está suspendido', () => {
            const req = {
                tenant: {
                    status: 'suspended',
                    subscription_expires_at: new Date(Date.now() + 1000000).toISOString()
                }
            } as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            requireActiveSubscription(req, res, next);
            expect(res.status).toHaveBeenCalledWith(402);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'subscription_suspended' }));
            expect(next).not.toHaveBeenCalled();
        });

        it('debe responder 402 si la suscripción está expirada', () => {
            const req = {
                tenant: {
                    status: 'active',
                    subscription_expires_at: new Date(Date.now() - 1000000).toISOString()
                }
            } as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            requireActiveSubscription(req, res, next);
            expect(res.status).toHaveBeenCalledWith(402);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'subscription_expired' }));
            expect(next).not.toHaveBeenCalled();
        });

        it('debe responder 402 si el estado o vigencia es missing o no válido', () => {
            const req = {
                tenant: {
                    status: undefined,
                    subscription_expires_at: undefined
                }
            } as unknown as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            requireActiveSubscription(req, res, next);
            expect(res.status).toHaveBeenCalledWith(402);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'subscription_invalid' }));
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('6. Control de Acceso por Módulos / Planes (hasFeatureEnabled)', () => {
        const basicPlan = {
            has_kitchen_display: false,
            has_analytics: false,
            has_reservations: false,
            has_cash_register: false,
            has_qr_ordering: true,
            max_tables: 10,
            max_users: 2,
        };

        const proPlan = {
            has_kitchen_display: true,
            has_analytics: true,
            has_reservations: true,
            has_cash_register: true,
            has_qr_ordering: true,
            max_tables: 30,
            max_users: 8,
        };

        it('debe denegar analíticas y pantalla de cocina en el Plan Básico', () => {
            expect(hasFeatureEnabled(basicPlan, 'has_kitchen_display')).toBe(false);
            expect(hasFeatureEnabled(basicPlan, 'has_analytics')).toBe(false);
            expect(hasFeatureEnabled(basicPlan, 'has_qr_ordering')).toBe(true);
        });

        it('debe permitir todos los módulos en el Plan Pro', () => {
            expect(hasFeatureEnabled(proPlan, 'has_kitchen_display')).toBe(true);
            expect(hasFeatureEnabled(proPlan, 'has_analytics')).toBe(true);
            expect(hasFeatureEnabled(proPlan, 'has_cash_register')).toBe(true);
            expect(hasFeatureEnabled(proPlan, 'has_reservations')).toBe(true);
        });

        it('debe retornar false de forma segura si el plan es undefined', () => {
            expect(hasFeatureEnabled(undefined, 'has_analytics')).toBe(false);
        });
    });

    describe('7. Middleware requireFeature', () => {
        const createMockRes = () => {
            const res: Partial<Response> = {};
            res.status = jest.fn().mockReturnValue(res);
            res.json = jest.fn().mockReturnValue(res);
            return res as Response;
        };

        it('debe llamar a next() si no hay tenant adjunto', () => {
            const middleware = requireFeature('has_analytics');
            const req = {} as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            middleware(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('debe llamar a next() si el tenant cuenta con la característica habilitada', () => {
            const middleware = requireFeature('has_analytics');
            const req = {
                tenant: {
                    plan: {
                        has_analytics: true
                    }
                }
            } as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            middleware(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('debe responder 403 si el plan no incluye la característica requerida', () => {
            const middleware = requireFeature('has_kitchen_display');
            const req = {
                tenant: {
                    plan: {
                        has_kitchen_display: false
                    }
                }
            } as TenantRequest;
            const res = createMockRes();
            const next: NextFunction = jest.fn();

            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'feature_not_included' }));
            expect(next).not.toHaveBeenCalled();
        });
    });
});
