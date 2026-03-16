import { Router } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 1. Get Reservations (with optional filters)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { shift, startDate, endDate } = req.query;

        let queryStr = 'SELECT * FROM reservations WHERE 1=1';
        const queryParams: any[] = [];
        let paramCount = 1;

        if (shift) {
            queryStr += ` AND shift = $${paramCount}`;
            queryParams.push(shift);
            paramCount++;
        }

        if (startDate) {
            queryStr += ` AND reservation_time >= $${paramCount}`;
            queryParams.push(startDate);
            paramCount++;
        }

        if (endDate) {
            queryStr += ` AND reservation_time <= $${paramCount}`;
            queryParams.push(endDate);
            paramCount++;
        }

        queryStr += ' ORDER BY reservation_time ASC';

        const { rows } = await pool.query(queryStr, queryParams);
        res.json(rows);
    } catch (error: any) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Error del servidor al obtener reservaciones.' });
    }
});

// 2. Create Reservation
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { table_id, customer_name, pax, reservation_time, shift, status, notes } = req.body;

        const { rows } = await pool.query(
            `INSERT INTO reservations (table_id, customer_name, pax, reservation_time, shift, status, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [table_id, customer_name, pax, reservation_time, shift, status || 'pending', notes]
        );

        res.status(201).json(rows[0]);
    } catch (error: any) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ error: 'Error del servidor al crear reservación.' });
    }
});

// 3. Update Reservation
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Construct dynamic update query
        const keys = Object.keys(updates);
        if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });

        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = Object.values(updates);
        
        values.push(id); // push id as the last parameter

        const queryStr = `UPDATE reservations SET ${setClause} WHERE id = $${values.length} RETURNING *`;

        const { rows } = await pool.query(queryStr, values);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Reservación no encontrada.' });
        }

        res.json(rows[0]);
    } catch (error: any) {
        console.error('Error updating reservation:', error);
        res.status(500).json({ error: 'Error del servidor al actualizar reservación.' });
    }
});

export default router;
