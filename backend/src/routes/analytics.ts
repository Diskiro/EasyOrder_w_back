import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Helper to cast strings to numbers for Postgres NUMERIC columns
const parseNum = (val: any) => Number(val) || 0;

router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const { timeRange } = req.query; // 'day' | 'week' | 'month'

        // Determine the start date string for the chart
        let fetchStartDays = 7; // default week
        if (timeRange === 'day') fetchStartDays = 0;
        if (timeRange === 'month') fetchStartDays = 30;

        // Run independent queries in parallel via the DB connection pool
        const [
            todaysOrdersResult,
            activeOrdersResult,
            productsResult,
            staffResult,
            chartOrdersResult
        ] = await Promise.all([
            pool.query(`
                SELECT total_amount 
                FROM orders 
                WHERE created_at >= CURRENT_DATE 
                  AND created_at < CURRENT_DATE + INTERVAL '1 day'
            `),
            pool.query(`
                SELECT COUNT(*) as exact_count 
                FROM orders 
                WHERE status IN ('pending', 'cooking', 'ready')
            `),
            pool.query(`
                SELECT COUNT(*) as exact_count 
                FROM products 
                WHERE is_active = true
            `),
            pool.query(`
                SELECT COUNT(*) as exact_count 
                FROM profiles
            `),
            pool.query(`
                SELECT total_amount, created_at 
                FROM orders 
                WHERE created_at >= (CURRENT_DATE - $1 * INTERVAL '1 day')
                  AND created_at < CURRENT_DATE + INTERVAL '1 day'
                ORDER BY created_at ASC
            `, [fetchStartDays])
        ]);

        const totalSalesToday = todaysOrdersResult.rows.reduce(
            (sum, order) => sum + parseNum(order.total_amount), 0
        );

        res.json({
            stats: {
                totalSales: totalSalesToday,
                activeOrders: parseNum(activeOrdersResult.rows[0]?.exact_count),
                totalProducts: parseNum(productsResult.rows[0]?.exact_count),
                totalStaff: parseNum(staffResult.rows[0]?.exact_count)
            },
            chartOrders: chartOrdersResult.rows.map(row => ({
                ...row,
                total_amount: parseNum(row.total_amount)
            }))
        });

    } catch (error: any) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
