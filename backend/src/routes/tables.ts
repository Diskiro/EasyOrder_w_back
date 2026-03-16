import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Retrieve all tables
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM tables ORDER BY number ASC');
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create table
router.post('/', authenticateToken, async (req, res) => {
    const { number, capacity } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO tables (number, capacity, status) VALUES ($1, $2, $3) RETURNING *',
            [number, capacity, 'available']
        );
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update table
router.patch('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const keys = Object.keys(updates);
        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = keys.map((key) => updates[key]);

        const { rows } = await pool.query(
            `UPDATE tables SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete table
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tables WHERE id = $1', [id]);
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
