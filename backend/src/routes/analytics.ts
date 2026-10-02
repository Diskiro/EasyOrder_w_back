import { Router, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';
import { extractTargetTenantId } from '../utils/dbHelpers';

const router = Router();

// Helper to cast strings to numbers for Postgres NUMERIC columns
const parseNum = (val: any): number => Number(val) || 0;

/**
 * SRP: Valida y normaliza el rango de tiempo para el gráfico de analíticas
 */
export function getChartStartDays(timeRange: unknown): number {
    if (timeRange === 'day') return 0;
    if (timeRange === 'month') return 30;
    return 7; // default week
}

/**
 * GET /api/analytics/dashboard
 * Retorna las métricas consolidadas del restaurante del usuario autenticado
 */
router.get('/dashboard', authenticateToken, async (req: AuthRequest & TenantRequest, res: Response) => {
    try {
        const targetRestaurantId = extractTargetTenantId(req.user, req.tenant);

        if (!targetRestaurantId && req.user.role !== 'superadmin') {
            return res.status(400).json({
                error: 'Se requiere un restaurante válido para consultar las analíticas.'
            });
        }

        const fetchStartDays = getChartStartDays(req.query.timeRange);

        // Construir cláusula de filtro por restaurante
        const tenantFilter = targetRestaurantId ? 'AND restaurant_id = $1' : '';
        const tenantWhere = targetRestaurantId ? 'WHERE restaurant_id = $1' : '';
        const queryParams = targetRestaurantId ? [targetRestaurantId] : [];

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
                  ${tenantFilter}
            `, queryParams),
            pool.query(`
                SELECT COUNT(*) as exact_count 
                FROM orders 
                WHERE status IN ('pending', 'cooking', 'ready')
                  ${tenantFilter}
            `, queryParams),
            pool.query(`
                SELECT COUNT(*) as exact_count 
                FROM products 
                WHERE is_active = true
                  ${tenantFilter}
            `, queryParams),
            pool.query(`
                SELECT COUNT(*) as exact_count 
                FROM profiles
                ${tenantWhere}
            `, queryParams),
            pool.query(`
                SELECT total_amount, created_at 
                FROM orders 
                WHERE created_at >= (CURRENT_DATE - $1 * INTERVAL '1 day')
                  AND created_at < CURRENT_DATE + INTERVAL '1 day'
                  ${targetRestaurantId ? 'AND restaurant_id = $2' : ''}
                ORDER BY created_at ASC
            `, targetRestaurantId ? [fetchStartDays, targetRestaurantId] : [fetchStartDays])
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
