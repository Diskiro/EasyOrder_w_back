import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';

const router = Router();

// Retrieve all tables for current restaurant
router.get('/', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    try {
        const targetRestaurantId = req.user.role === 'superadmin' && !req.tenant?.id
            ? null
            : (req.user.restaurant_id || req.tenant?.id);

        let query = 'SELECT * FROM tables';
        const params: any[] = [];

        if (targetRestaurantId) {
            query += ' WHERE restaurant_id = $1';
            params.push(targetRestaurantId);
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
        const targetRestaurantId = req.user.restaurant_id || req.tenant?.id;
        if (!targetRestaurantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para registrar la mesa.' });
        }

        // Validar límite máximo de mesas del plan
        if (targetRestaurantId && req.tenant?.plan?.max_tables) {
            const countRes = await pool.query(
                'SELECT COUNT(*) FROM tables WHERE restaurant_id = $1',
                [targetRestaurantId]
            );
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
            [number.trim(), Number(capacity) || 4, 'available', targetRestaurantId]
        );
        res.status(201).json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update table with tenant check
router.patch('/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const targetRestaurantId = req.user.role === 'superadmin' ? null : (req.user.restaurant_id || req.tenant?.id);
        const keys = Object.keys(updates);
        if (keys.length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = keys.map((key) => updates[key]);

        let query = `UPDATE tables SET ${setClause} WHERE id = $1`;
        const params = [id, ...values];

        if (targetRestaurantId) {
            query += ` AND restaurant_id = $${keys.length + 2}`;
            params.push(targetRestaurantId);
        }

        query += ' RETURNING *';
        const { rows } = await pool.query(query, params);

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
    try {
        const targetRestaurantId = req.user.role === 'superadmin' ? null : (req.user.restaurant_id || req.tenant?.id);
        let query = 'DELETE FROM tables WHERE id = $1';
        const params = [id];

        if (targetRestaurantId) {
            query += ' AND restaurant_id = $2';
            params.push(targetRestaurantId);
        }

        const result = await pool.query(query, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Mesa no encontrada o no pertenece a tu restaurante' });
        }

        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

