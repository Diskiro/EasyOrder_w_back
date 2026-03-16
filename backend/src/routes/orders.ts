import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Active Orders
router.get('/active', authenticateToken, async (req, res) => {
    try {
        // We need to fetch orders, resolving tables, order_items, and products 
        // This replicates the Supabase relation mapping
        const ordersQuery = `
      SELECT o.*,
             row_to_json(t) as table,
             (
                SELECT json_agg(
                  json_build_object(
                    'id', oi.id,
                    'order_id', oi.order_id,
                    'product_id', oi.product_id,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'is_ready', oi.is_ready,
                    'notes', oi.notes,
                    'product', row_to_json(p)
                  )
                )
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = o.id
             ) as order_items
      FROM orders o
      JOIN tables t ON t.id = o.table_id
      WHERE o.status != 'completed' AND o.status != 'cancelled'
      ORDER BY o.created_at ASC;
    `;
        const { rows } = await pool.query(ordersQuery);

        // Convert null array aggregations to empty arrays
        const orders = rows.map(r => ({ ...r, order_items: r.order_items || [] }));

        res.json(orders);
    } catch (error: any) {
        console.error('Error fetching active orders:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create Order (uses a Postgres transaction)
router.post('/', authenticateToken, async (req, res) => {
    const { tableId, serverId, items } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const total = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);

        const { rows: orderRows } = await client.query(
            `INSERT INTO orders (table_id, server_id, status, total_amount) 
       VALUES ($1, $2, 'pending', $3) RETURNING *`,
            [tableId, serverId, total]
        );
        const order = orderRows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, unit_price, is_ready, notes)
         VALUES ($1, $2, $3, $4, false, $5)`,
                [order.id, item.productId, item.quantity, item.price, item.notes || null]
            );
        }

        await client.query(
            `UPDATE tables SET status = 'occupied', current_order_id = $1 WHERE id = $2`,
            [order.id, tableId]
        );

        await client.query('COMMIT');
        req.app.get('io').emit('db_change', { table: 'orders' });
        req.app.get('io').emit('db_change', { table: 'order_items' });
        req.app.get('io').emit('db_change', { table: 'tables' });
        res.json(order);
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update Order Status
router.patch('/:orderId/status', authenticateToken, async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);

        const { rows } = await client.query('SELECT table_id FROM orders WHERE id = $1', [orderId]);
        const tableId = rows[0]?.table_id;

        if (tableId) {
            if (status === 'completed') {
                await client.query(
                    "UPDATE orders SET status = 'completed' WHERE table_id = $1 AND status != 'cancelled' AND status != 'completed'",
                    [tableId]
                );
                await client.query("UPDATE tables SET status = 'available', current_order_id = NULL WHERE id = $1", [tableId]);
            } else if (status === 'cancelled') {
                const { rows: countRows } = await client.query(
                    "SELECT COUNT(id) as count FROM orders WHERE table_id = $1 AND status != 'completed' AND status != 'cancelled' AND id != $2",
                    [tableId, orderId]
                );
                if (parseInt(countRows[0].count) === 0) {
                    await client.query("UPDATE tables SET status = 'available', current_order_id = NULL WHERE id = $1", [tableId]);
                }
            }
        }

        await client.query('COMMIT');
        res.json({ status: 'ok' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update single item readyness
router.patch('/:orderId/items/:itemId/ready', authenticateToken, async (req, res) => {
    const { orderId, itemId } = req.params;
    const { isReady } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query('UPDATE order_items SET is_ready = $1 WHERE id = $2', [isReady, itemId]);

        const { rows: allItems } = await client.query('SELECT is_ready FROM order_items WHERE order_id = $1', [orderId]);

        if (allItems.length > 0) {
            const isAllReady = allItems.every((item) => item.is_ready);
            if (isAllReady) {
                await client.query("UPDATE orders SET status = 'ready' WHERE id = $1", [orderId]);
            } else if (!isReady) {
                await client.query("UPDATE orders SET status = 'cooking' WHERE id = $1", [orderId]);
            }
        }

        await client.query('COMMIT');
        res.json({ status: 'ok' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update whole items list of an active order
router.patch('/:orderId/items', authenticateToken, async (req, res) => {
    const { orderId } = req.params;
    const { items } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const total = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);

        const { rows: existingItems } = await client.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
        const { rows: orderData } = await client.query('SELECT status FROM orders WHERE id = $1', [orderId]);
        const currentStatus = orderData[0]?.status;

        let needsKitchenAttention = false;
        const existingMap = new Map(existingItems.map((item: any) => [item.product_id, item]));
        const incomingProductIds = new Set(items.map((item: any) => item.productId));

        const idsToDelete = existingItems
            .filter((item: any) => !incomingProductIds.has(item.product_id))
            .map((item: any) => item.id);

        if (idsToDelete.length > 0) {
            const placeholders = idsToDelete.map((_: any, i: number) => `$${i + 1}`).join(',');
            await client.query(`DELETE FROM order_items WHERE id IN (${placeholders})`); // Note parameterization would normally be used here but using in clause with values
        }

        for (const item of items) {
            const existing = existingMap.get(item.productId);
            if (existing) {
                const isQuantityIncreased = item.quantity > existing.quantity;
                if (isQuantityIncreased) needsKitchenAttention = true;

                await client.query(
                    `UPDATE order_items 
                     SET quantity = $1, unit_price = $2, is_ready = $3, notes = $4 
                     WHERE id = $5`,
                    [item.quantity, item.price, isQuantityIncreased ? false : existing.is_ready, item.notes || null, existing.id]
                );
            } else {
                needsKitchenAttention = true;
                await client.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, unit_price, is_ready, notes)
                     VALUES ($1, $2, $3, $4, false, $5)`,
                    [orderId, item.productId, item.quantity, item.price, item.notes || null]
                );
            }
        }

        let nextStatus = currentStatus;
        if (needsKitchenAttention && (currentStatus === 'ready' || currentStatus === 'delivered')) {
            nextStatus = 'cooking';
        }

        await client.query('UPDATE orders SET total_amount = $1, status = $2 WHERE id = $3', [total, nextStatus, orderId]);

        await client.query('COMMIT');
        req.app.get('io').emit('db_change', { table: 'order_items' });
        req.app.get('io').emit('db_change', { table: 'orders' });
        res.json({ status: 'ok' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
