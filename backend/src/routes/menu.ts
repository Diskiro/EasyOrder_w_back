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

// -----------------------------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------------------------
router.get('/categories', authenticateToken, createTenantGetHandler('categories', 'sort_order ASC', 'is_active = true'));

router.post('/categories', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { name, type, sort_order } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }

    try {
        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        if (!targetTenantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para crear la categoría.' });
        }

        const { rows } = await pool.query(
            'INSERT INTO categories (name, type, sort_order, restaurant_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name.trim(), type || 'food', Number(sort_order) || 0, targetTenantId]
        );
        res.status(201).json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/categories/:id', authenticateToken, createTenantPatchHandler('categories', 'Categoría no encontrada o no pertenece a tu restaurante'));

router.delete('/categories/:id', authenticateToken, createTenantDeleteHandler('categories', 'Categoría no encontrada o no pertenece a tu restaurante'));

// -----------------------------------------------------------------------------
// PRODUCTS
// -----------------------------------------------------------------------------
router.get('/products', authenticateToken, createTenantGetHandler('products', 'name ASC'));

router.post('/products', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const p = req.body;

    if (!p.name || typeof p.name !== 'string' || !p.name.trim()) {
        return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    try {
        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        if (!targetTenantId && req.user.role !== 'superadmin') {
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
                targetTenantId
            ]
        );
        res.status(201).json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/products/:id', authenticateToken, createTenantPatchHandler('products', 'Producto no encontrado o no pertenece a tu restaurante'));

router.delete('/products/:id', authenticateToken, createTenantDeleteHandler('products', 'Producto no encontrado o no pertenece a tu restaurante'));

export default router;
