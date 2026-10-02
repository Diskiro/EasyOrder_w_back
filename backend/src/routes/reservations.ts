import { Router, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';
import {
    extractTargetTenantId,
    createTenantPatchHandler,
    createTenantDeleteHandler
} from '../utils/dbHelpers';

const router = Router();

// 1. Get Reservations (filtered by tenant with optional shift and date range filters)
router.get('/', authenticateToken, async (req: AuthRequest & TenantRequest, res: Response) => {
    try {
        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        if (!targetTenantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para consultar reservaciones.' });
        }

        const { shift, startDate, endDate } = req.query;

        let queryStr = 'SELECT * FROM reservations WHERE 1=1';
        const queryParams: any[] = [];

        if (targetTenantId) {
            queryParams.push(targetTenantId);
            queryStr += ` AND restaurant_id = $${queryParams.length}`;
        }

        if (shift && typeof shift === 'string') {
            queryParams.push(shift);
            queryStr += ` AND shift = $${queryParams.length}`;
        }

        if (startDate && typeof startDate === 'string') {
            queryParams.push(startDate);
            queryStr += ` AND reservation_time >= $${queryParams.length}`;
        }

        if (endDate && typeof endDate === 'string') {
            queryParams.push(endDate);
            queryStr += ` AND reservation_time <= $${queryParams.length}`;
        }

        queryStr += ' ORDER BY reservation_time ASC';

        const { rows } = await pool.query(queryStr, queryParams);
        res.json(rows);
    } catch (error: any) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Error del servidor al obtener reservaciones.' });
    }
});

// 2. Create Reservation (with tenant assignment & input validation)
router.post('/', authenticateToken, async (req: AuthRequest & TenantRequest, res: Response) => {
    try {
        const { table_id, customer_name, pax, reservation_time, shift, status, notes } = req.body;

        if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
            return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
        }

        const parsedPax = Number(pax);
        if (!pax || isNaN(parsedPax) || parsedPax <= 0) {
            return res.status(400).json({ error: 'El número de comensales (pax) debe ser mayor a 0.' });
        }

        if (!reservation_time || isNaN(Date.parse(reservation_time))) {
            return res.status(400).json({ error: 'La fecha y hora de la reservación son obligatorias y deben ser válidas.' });
        }

        const targetTenantId = extractTargetTenantId(req.user, req.tenant);
        if (!targetTenantId && req.user.role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para crear la reservación.' });
        }

        const { rows } = await pool.query(
            `INSERT INTO reservations (table_id, customer_name, pax, reservation_time, shift, status, notes, restaurant_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                table_id || null,
                customer_name.trim(),
                parsedPax,
                reservation_time,
                shift || 'lunch',
                status || 'pending',
                notes || null,
                targetTenantId
            ]
        );

        res.status(201).json(rows[0]);
    } catch (error: any) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ error: 'Error del servidor al crear reservación.' });
    }
});

// 3. Update Reservation (tenant-isolated via dbHelper)
router.patch('/:id', authenticateToken, createTenantPatchHandler('reservations', 'Reservación no encontrada o no pertenece a tu restaurante'));

// 4. Delete Reservation (tenant-isolated via dbHelper)
router.delete('/:id', authenticateToken, createTenantDeleteHandler('reservations', 'Reservación no encontrada o no pertenece a tu restaurante'));

export default router;
