import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';
import {
    extractTargetTenantId,
    createTenantGetHandler,
    createTenantPatchHandler,
    createTenantDeleteHandler
} from '../utils/dbHelpers';

const router = Router();

// Retrieve all tables for current restaurant
router.get('/', authenticateToken, createTenantGetHandler('tables', 'number ASC'));

// Create table with tenant assignment & quota check
router.post('/', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { number, capacity } = req.body;

    if (!number || typeof number !== 'string' || !number.trim()) {
        return res.status(400).json({ error: 'El número o identificador de mesa es obligatorio' });
    }

    try {
        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        if (!targetTenantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para registrar la mesa.' });
        }

        if (targetTenantId && req.tenant?.plan?.max_tables) {
            const countRes = await pool.query('SELECT COUNT(*) FROM tables WHERE restaurant_id = $1', [targetTenantId]);
            const currentCount = parseInt(countRes.rows[0].count, 10);
            if (currentCount >= req.tenant.plan.max_tables) {
                return res.status(400).json({
                    error: 'table_limit_reached',
                    message: `Has alcanzado el límite máximo de ${req.tenant.plan.max_tables} mesas para tu plan actual.`
                });
            }
        }

        const { rows } = await pool.query(
            'INSERT INTO tables (number, capacity, status, restaurant_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [number.trim(), Number(capacity) || 4, 'available', targetTenantId]
        );
        res.status(201).json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update table with tenant check
router.patch('/:id', authenticateToken, createTenantPatchHandler('tables', 'Mesa no encontrada o no pertenece a tu restaurante'));

// Delete table with tenant check
router.delete('/:id', authenticateToken, createTenantDeleteHandler('tables', 'Mesa no encontrada o no pertenece a tu restaurante'));

export default router;
