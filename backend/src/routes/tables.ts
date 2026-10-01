import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';
import { extractTargetTenantId, buildTenantUpdateQuery, buildTenantDeleteQuery } from '../utils/dbHelpers';

const router = Router();

// Retrieve all tables for current restaurant
router.get('/', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    try {
        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        let query = 'SELECT * FROM tables';
        const params: any[] = [];

        if (targetTenantId) {
            query += ' WHERE restaurant_id = $1';
            params.push(targetTenantId);
        }

        query += ' ORDER BY number ASC';
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

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
router.patch('/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { id } = req.params;
    const targetTenantId = extractTargetTenantId(req.user, req.tenant);
    const updateHelper = buildTenantUpdateQuery('tables', String(id), req.body, targetTenantId);

    if (!updateHelper) {
        return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    try {
        const { rows } = await pool.query(updateHelper.query, updateHelper.params);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Mesa no encontrada o no pertenece a tu restaurante' });
        }
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete table with tenant check
router.delete('/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { id } = req.params;
    const targetTenantId = extractTargetTenantId(req.user, req.tenant);
    const deleteHelper = buildTenantDeleteQuery('tables', String(id), targetTenantId);

    try {
        const result = await pool.query(deleteHelper.query, deleteHelper.params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Mesa no encontrada o no pertenece a tu restaurante' });
        }
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
