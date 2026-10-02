import { Router, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';
import { extractTargetTenantId } from '../utils/dbHelpers';

const router = Router();

// Get the current active session (or the most recently closed one if none is active) for the tenant
router.get('/', authenticateToken, async (req: AuthRequest & TenantRequest, res: Response) => {
    try {
        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        if (!targetTenantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para consultar la caja.' });
        }

        const query = targetTenantId
            ? 'SELECT * FROM cash_register_sessions WHERE restaurant_id = $1 ORDER BY opened_at DESC LIMIT 1'
            : 'SELECT * FROM cash_register_sessions ORDER BY opened_at DESC LIMIT 1';
        const params = targetTenantId ? [targetTenantId] : [];

        const { rows } = await pool.query(query, params);
        res.json(rows[0] || null);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Open a new session
router.post('/open', authenticateToken, async (req: AuthRequest & TenantRequest, res: Response) => {
    const { startAmount, userId } = req.body;

    if (startAmount === undefined || startAmount === null || isNaN(Number(startAmount)) || Number(startAmount) < 0) {
        return res.status(400).json({ error: 'El monto inicial debe ser un número mayor o igual a 0.' });
    }

    try {
        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        if (!targetTenantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para abrir la caja.' });
        }

        // Enforce only one open session at a time per restaurant
        const checkQuery = targetTenantId
            ? 'SELECT id FROM cash_register_sessions WHERE closed_at IS NULL AND restaurant_id = $1 LIMIT 1'
            : 'SELECT id FROM cash_register_sessions WHERE closed_at IS NULL LIMIT 1';
        const checkParams = targetTenantId ? [targetTenantId] : [];

        const { rows: currentOpen } = await pool.query(checkQuery, checkParams);

        if (currentOpen.length > 0) {
            return res.status(400).json({ error: 'Ya hay una caja abierta para este restaurante.' });
        }

        const actualUserId = userId || req.user?.id;
        const { rows } = await pool.query(
            `INSERT INTO cash_register_sessions (user_id, start_amount, restaurant_id) 
             VALUES ($1, $2, $3) RETURNING *`,
            [actualUserId, Number(startAmount), targetTenantId]
        );
        res.status(201).json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Close a session
router.patch('/close/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res: Response) => {
    const { endAmount, notes } = req.body;
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'El ID de la sesión es obligatorio.' });
    }

    if (endAmount === undefined || endAmount === null || isNaN(Number(endAmount)) || Number(endAmount) < 0) {
        return res.status(400).json({ error: 'El monto final debe ser un número mayor o igual a 0.' });
    }

    try {
        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        if (!targetTenantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para cerrar la caja.' });
        }

        let updateQuery = `
            UPDATE cash_register_sessions 
            SET end_amount = $1, notes = $2, closed_at = NOW() 
            WHERE id = $3 AND closed_at IS NULL
        `;
        const params: any[] = [Number(endAmount), notes || null, id];

        if (targetTenantId) {
            params.push(targetTenantId);
            updateQuery += ` AND restaurant_id = $${params.length}`;
        }

        updateQuery += ' RETURNING *';

        const { rows } = await pool.query(updateQuery, params);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Sesión no encontrada, ya cerrada o no pertenece a tu restaurante.' });
        }
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
