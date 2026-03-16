import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get the current active session (or the most recently closed one if none is active)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM cash_register_sessions 
             ORDER BY opened_at DESC LIMIT 1`
        );
        res.json(rows[0] || null);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Open a new session
router.post('/open', authenticateToken, async (req, res) => {
    const { startAmount, userId } = req.body;
    try {
        // Enforce only one open session at a time
        const { rows: currentOpen } = await pool.query(
            'SELECT id FROM cash_register_sessions WHERE closed_at IS NULL LIMIT 1'
        );

        if (currentOpen.length > 0) {
            return res.status(400).json({ error: 'Ya hay una caja abierta.' });
        }

        const { rows } = await pool.query(
            `INSERT INTO cash_register_sessions (user_id, start_amount) 
             VALUES ($1, $2) RETURNING *`,
            [userId, startAmount]
        );
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Close a session
router.patch('/close/:id', authenticateToken, async (req, res) => {
    const { endAmount, notes, userId } = req.body;
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            `UPDATE cash_register_sessions 
             SET end_amount = $1, notes = $2, closed_at = NOW() 
             WHERE id = $3 AND closed_at IS NULL 
             RETURNING *`,
            [endAmount, notes, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Sesión no encontrada o ya cerrada.' });
        }
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
