import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// -----------------------------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------------------------
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order ASC');
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/categories', authenticateToken, async (req, res) => {
    const { name, type, sort_order } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO categories (name, type, sort_order) VALUES ($1, $2, $3) RETURNING *',
            [name, type, sort_order]
        );
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/categories/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const keys = Object.keys(updates);
        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = keys.map((key) => updates[key]);
        const { rows } = await pool.query(
            `UPDATE categories SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/categories/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// -----------------------------------------------------------------------------
// PRODUCTS
// -----------------------------------------------------------------------------
router.get('/products', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM products ORDER BY name ASC');
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/products', authenticateToken, async (req, res) => {
    const p = req.body;
    try {
        const { rows } = await pool.query(
            `INSERT INTO products (category_id, name, description, price, image_url, stock_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [p.category_id, p.name, p.description, p.price, p.image_url, p.stock_status, p.is_active]
        );
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const keys = Object.keys(updates);
        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = keys.map((key) => updates[key]);
        const { rows } = await pool.query(
            `UPDATE products SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/products/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
