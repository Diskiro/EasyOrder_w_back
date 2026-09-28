import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenant';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/db';

const router = Router();

/**
 * SRP: Endpoint público para obtener la configuración visual y permisos del restaurante actual
 */
router.get('/current', async (req: TenantRequest, res: Response) => {
    try {
        if (!req.tenant) {
            return res.status(404).json({ error: 'No se identificó ningún restaurante activo.' });
        }

        // Devolvemos la información pública del restaurante (Branding y características del plan)
        res.json({
            id: req.tenant.id,
            slug: req.tenant.slug,
            name: req.tenant.name,
            plan_id: req.tenant.plan_id,
            status: req.tenant.status,
            subscription_expires_at: req.tenant.subscription_expires_at,
            primary_color: req.tenant.primary_color,
            logo_url: req.tenant.logo_url,
            features: req.tenant.plan
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al consultar datos del restaurante' });
    }
});

/**
 * SRP: Endpoint para que el SuperAdmin liste todos los restaurantes registrados
 */
router.get('/all', authenticateToken, async (req: TenantRequest, res: Response) => {
    try {
        // Solo el superadmin puede ver la lista global de todos los restaurantes
        if (req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso reservado para el SuperAdmin.' });
        }

        const { rows } = await pool.query(
            `SELECT r.*, p.name as plan_name, p.price_monthly
             FROM restaurants r
             LEFT JOIN subscription_plans p ON r.plan_id = p.id
             ORDER BY r.created_at DESC`
        );

        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener la lista de restaurantes' });
    }
});

/**
 * SRP: Endpoint para que el SuperAdmin extienda suscripción o cambie estado (+30 días, suspender)
 */
router.patch('/:id/subscription', authenticateToken, async (req: TenantRequest, res: Response) => {
    try {
        if (req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso reservado para el SuperAdmin.' });
        }

        const { id } = req.params;
        const { status, addDays, plan_id } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        let index = 1;

        if (status && ['active', 'suspended', 'past_due'].includes(status)) {
            updates.push(`status = $${index++}`);
            values.push(status);
        }

        if (plan_id) {
            updates.push(`plan_id = $${index++}`);
            values.push(plan_id);
        }

        if (typeof addDays === 'number' && addDays > 0) {
            updates.push(`subscription_expires_at = GREATEST(subscription_expires_at, NOW()) + ($${index++} || ' days')::INTERVAL`);
            values.push(addDays);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar.' });
        }

        values.push(id);
        const query = `UPDATE restaurants SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`;
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Restaurante no encontrado.' });
        }

        res.json({ message: 'Suscripción actualizada correctamente', restaurant: rows[0] });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar la suscripción' });
    }
});

/**
 * SRP: Endpoint público/protegido para obtener el catálogo de planes de suscripción
 */
router.get('/plans', async (_req: TenantRequest, res: Response) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM subscription_plans ORDER BY price_monthly ASC'
        );
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al consultar planes de suscripción' });
    }
});

const RESERVED_SLUGS = new Set(['api', 'admin', 'www', 'mail', 'app', 'localhost']);
const SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * SRP: Endpoint para que el SuperAdmin dé de alta un nuevo restaurante (Tenant)
 */
router.post('/', authenticateToken, async (req: TenantRequest, res: Response) => {
    try {
        if (req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso reservado para el SuperAdmin.' });
        }

        const { name, slug, plan_id, primary_color, logo_url, phone, address } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ error: 'El nombre del restaurante es obligatorio y debe tener al menos 2 caracteres.' });
        }

        if (!slug || typeof slug !== 'string') {
            return res.status(400).json({ error: 'El identificador (slug) es obligatorio.' });
        }

        const cleanedSlug = slug.trim().toLowerCase();
        if (!SLUG_REGEX.test(cleanedSlug) || RESERVED_SLUGS.has(cleanedSlug)) {
            return res.status(400).json({
                error: 'El slug solo puede contener letras minúsculas, números y guiones, y no puede usar palabras reservadas.'
            });
        }

        // Verificar si el slug ya existe
        const existing = await pool.query('SELECT id FROM restaurants WHERE slug = $1 LIMIT 1', [cleanedSlug]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: `El subdominio "${cleanedSlug}" ya se encuentra registrado.` });
        }

        const targetPlan = plan_id || 'basico';
        const targetColor = primary_color || '#FBBF24';

        const { rows } = await pool.query(
            `INSERT INTO restaurants (name, slug, plan_id, primary_color, logo_url, phone, address, status, subscription_expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW() + INTERVAL '30 days')
             RETURNING *`,
            [name.trim(), cleanedSlug, targetPlan, targetColor, logo_url || null, phone || null, address || null]
        );

        res.status(201).json({
            message: 'Restaurante creado exitosamente',
            restaurant: rows[0]
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar el nuevo restaurante' });
    }
});

export default router;
