import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';

export interface TenantInfo {
    id: string;
    slug: string;
    name: string;
    plan_id: string;
    status: 'active' | 'suspended' | 'past_due';
    subscription_expires_at: string;
    primary_color: string;
    logo_url?: string;
    plan: {
        has_kitchen_display: boolean;
        has_analytics: boolean;
        has_reservations: boolean;
        has_cash_register: boolean;
        has_qr_ordering: boolean;
        max_tables: number;
        max_users: number;
    };
}

export interface TenantRequest extends Request {
    tenant?: TenantInfo;
    user?: any;
}

/**
 * Extrae el slug del restaurante a partir del header 'X-Restaurant-Slug' o del subdominio de la petición
 * @param hostname - Nombre del host de la petición HTTP
 * @param headerSlug - Valor del header X-Restaurant-Slug si existe
 */
export function extractRestaurantSlug(hostname: string | undefined, headerSlug: string | undefined): string | null {
    // 1. Prioridad: Header explícito enviado por el cliente o frontend
    if (headerSlug && typeof headerSlug === 'string' && headerSlug.trim()) {
        const cleaned = headerSlug.trim().toLowerCase();
        // Validación estricta de caracteres seguros para slugs (alfanumérico y guiones)
        if (/^[a-z0-9-]+$/.test(cleaned)) {
            return cleaned;
        }
    }

    // 2. Extraer a partir del subdominio en producción (e.g. 'restaurante1.useeasyorder.com')
    if (hostname) {
        const parts = hostname.toLowerCase().split('.');
        // Caso de useeasyorder.com con subdominio (ej: ['mitienda', 'useeasyorder', 'com'])
        if (parts.length >= 3) {
            const subdomain = parts[0];
            // Excluir subdominios reservados de infraestructura
            if (!['api', 'admin', 'www', 'mail', 'app'].includes(subdomain)) {
                if (/^[a-z0-9-]+$/.test(subdomain)) {
                    return subdomain;
                }
            }
        }
    }

    return null;
}

/**
 * Middleware SRP: Identifica y adjunta los datos del restaurante (tenant) al objeto Request
 */
export const resolveTenant = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const slug = extractRestaurantSlug(
            req.hostname,
            req.headers['x-restaurant-slug'] as string | undefined
        );

        if (!slug) {
            // Si no hay subdominio especificado, usar 'demo' por defecto o requerir inquilino
            const defaultSlug = 'demo';
            const { rows } = await pool.query(
                `SELECT r.*, 
                        p.has_kitchen_display, p.has_analytics, p.has_reservations, 
                        p.has_cash_register, p.has_qr_ordering, p.max_tables, p.max_users
                 FROM restaurants r
                 LEFT JOIN subscription_plans p ON r.plan_id = p.id
                 WHERE r.slug = $1 LIMIT 1`,
                [defaultSlug]
            );

            if (rows.length > 0) {
                const r = rows[0];
                req.tenant = {
                    id: r.id,
                    slug: r.slug,
                    name: r.name,
                    plan_id: r.plan_id,
                    status: r.status,
                    subscription_expires_at: r.subscription_expires_at,
                    primary_color: r.primary_color,
                    logo_url: r.logo_url,
                    plan: {
                        has_kitchen_display: r.has_kitchen_display,
                        has_analytics: r.has_analytics,
                        has_reservations: r.has_reservations,
                        has_cash_register: r.has_cash_register,
                        has_qr_ordering: r.has_qr_ordering,
                        max_tables: r.max_tables,
                        max_users: r.max_users
                    }
                };
            }
            return next();
        }

        // Buscar el restaurante y los módulos de su plan en la base de datos
        const { rows } = await pool.query(
            `SELECT r.*, 
                    p.has_kitchen_display, p.has_analytics, p.has_reservations, 
                    p.has_cash_register, p.has_qr_ordering, p.max_tables, p.max_users
             FROM restaurants r
             LEFT JOIN subscription_plans p ON r.plan_id = p.id
             WHERE r.slug = $1 LIMIT 1`,
            [slug]
        );

        if (rows.length === 0) {
            res.status(404).json({
                error: 'restaurant_not_found',
                message: `El restaurante con identificador "${slug}" no está registrado en EasyOrder.`
            });
            return;
        }

        const r = rows[0];
        req.tenant = {
            id: r.id,
            slug: r.slug,
            name: r.name,
            plan_id: r.plan_id,
            status: r.status,
            subscription_expires_at: r.subscription_expires_at,
            primary_color: r.primary_color,
            logo_url: r.logo_url,
            plan: {
                has_kitchen_display: r.has_kitchen_display,
                has_analytics: r.has_analytics,
                has_reservations: r.has_reservations,
                has_cash_register: r.has_cash_register,
                has_qr_ordering: r.has_qr_ordering,
                max_tables: r.max_tables,
                max_users: r.max_users
            }
        };

        next();
    } catch (error: any) {
        console.error('Error al resolver el inquilino (tenant):', error);
        res.status(500).json({ error: 'Error interno al identificar el restaurante' });
    }
};
