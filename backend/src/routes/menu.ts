import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';

const router = Router();

// -----------------------------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------------------------
router.get('/categories', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    try {
        const targetRestaurantId = req.user.role === 'superadmin' && !req.tenant?.id
            ? null
            : (req.user.restaurant_id || req.tenant?.id);

        let query = 'SELECT * FROM categories WHERE is_active = true';
        const params: any[] = [];

        if (targetRestaurantId) {
            query += ' AND restaurant_id = $1';
            params.push(targetRestaurantId);
        }

        query += ' ORDER BY sort_order ASC';
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/categories', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { name, type, sort_order } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }

    try {
        const targetRestaurantId = req.user.restaurant_id || req.tenant?.id;
        if (!targetRestaurantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para crear la categoría.' });
        }

        const { rows } = await pool.query(
            'INSERT INTO categories (name, type, sort_order, restaurant_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name.trim(), type || 'food', Number(sort_order) || 0, targetRestaurantId]
        );
        res.status(201).json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/categories/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
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

        let query = `UPDATE categories SET ${setClause} WHERE id = $1`;
        const params = [id, ...values];

        if (targetRestaurantId) {
            query += ` AND restaurant_id = $${keys.length + 2}`;
            params.push(targetRestaurantId);
        }

        query += ' RETURNING *';
        const { rows } = await pool.query(query, params);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada o no pertenece a tu restaurante' });
        }

        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/categories/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { id } = req.params;
    try {
        const targetRestaurantId = req.user.role === 'superadmin' ? null : (req.user.restaurant_id || req.tenant?.id);
        let query = 'DELETE FROM categories WHERE id = $1';
        const params = [id];

        if (targetRestaurantId) {
            query += ' AND restaurant_id = $2';
            params.push(targetRestaurantId);
        }

        const result = await pool.query(query, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada o no pertenece a tu restaurante' });
        }

        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// -----------------------------------------------------------------------------
// PRODUCTS
// -----------------------------------------------------------------------------
router.get('/products', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    try {
        const targetRestaurantId = req.user.role === 'superadmin' && !req.tenant?.id
            ? null
            : (req.user.restaurant_id || req.tenant?.id);

        let query = 'SELECT * FROM products';
        const params: any[] = [];

        if (targetRestaurantId) {
            query += ' WHERE restaurant_id = $1';
            params.push(targetRestaurantId);
        }

        query += ' ORDER BY name ASC';
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/products', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const p = req.body;

    if (!p.name || typeof p.name !== 'string' || !p.name.trim()) {
        return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    try {
        const targetRestaurantId = req.user.restaurant_id || req.tenant?.id;
        if (!targetRestaurantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para crear el producto.' });
        }

        const { rows } = await pool.query(
            `INSERT INTO products (category_id, name, description, price, image_url, stock_status, is_active, restaurant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                p.category_id,
                p.name.trim(),
                p.description || '',
                p.price || 0,
                p.image_url || null,
                p.stock_status || 'in_stock',
                p.is_active !== undefined ? p.is_active : true,
                targetRestaurantId
            ]
        );
        res.status(201).json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/products/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
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

        let query = `UPDATE products SET ${setClause} WHERE id = $1`;
        const params = [id, ...values];

        if (targetRestaurantId) {
            query += ` AND restaurant_id = $${keys.length + 2}`;
            params.push(targetRestaurantId);
        }

        query += ' RETURNING *';
        const { rows } = await pool.query(query, params);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado o no pertenece a tu restaurante' });
        }

        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/products/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { id } = req.params;
    try {
        const targetRestaurantId = req.user.role === 'superadmin' ? null : (req.user.restaurant_id || req.tenant?.id);
        let query = 'DELETE FROM products WHERE id = $1';
        const params = [id];

        if (targetRestaurantId) {
            query += ' AND restaurant_id = $2';
            params.push(targetRestaurantId);
        }

        const result = await pool.query(query, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Producto no encontrado o no pertenece a tu restaurante' });
        }

        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

