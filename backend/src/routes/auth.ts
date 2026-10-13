import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';
import {
    validateRegisterInput,
    validateStaffUpdate,
    isStaffActive,
    canUserAccessTenant,
    isUserLimitReached
} from '../utils/userValidation';

const router = Router();

// Login de Usuario con Validación Multi-Tenant
router.post('/login', async (req: TenantRequest, res) => {
    const { email, password, overrideLock } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Credenciales inválidas: email y contraseña requeridos' });
    }

    try {
        const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email.trim().toLowerCase()]);
        const user = rows[0];

        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificación criptográfica de la contraseña
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Comprobación de estado activo (Cuenta no desactivada)
        if (!isStaffActive(user)) {
            return res.status(403).json({
                error: 'user_deactivated',
                message: 'Esta cuenta ha sido desactivada por la administración del restaurante.'
            });
        }

        // Validación de Aislamiento Multi-Tenant (El usuario debe pertenecer al restaurante del contexto o ser superadmin)
        const currentTenantId = req.tenant?.id;
        if (!canUserAccessTenant(user.restaurant_id, user.role, currentTenantId)) {
            return res.status(403).json({
                error: 'tenant_forbidden',
                message: `El usuario no tiene autorización para acceder al restaurante "${req.tenant?.name || 'solicitado'}".`
            });
        }

        // Comprobación de Sesión Activa
        if (user.is_logged_in === 1 && !overrideLock) {
            return res.status(403).json({ error: 'Ya hay una sesión iniciada en otro dispositivo.' });
        }

        // Actualizar base de datos
        await pool.query('UPDATE profiles SET is_logged_in = 1, last_sign_in_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        // Generar JWT incluyendo restaurant_id
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, restaurant_id: user.restaurant_id },
            process.env.JWT_SECRET || 'super_secret_jwt_key_for_easyorder',
            { expiresIn: '10h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                restaurant_id: user.restaurant_id
            }
        });

    } catch (error: any) {
        console.error('Error in login:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Obtener info del usuario actual (Me)
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, email, full_name, role, is_logged_in, restaurant_id FROM profiles WHERE id = $1',
            [req.user.id]
        );
        res.json({ user: rows[0] });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Verify Admin (Permite verificar credenciales de administrador desde SignUpFlow o validar sesión existente)
router.post('/verify-admin', async (req: TenantRequest, res) => {
    const { email, password } = req.body || {};

    // 1. Si se envían credenciales explícitas (ej. flujo de SignUp desde la pantalla de login)
    if (email !== undefined || password !== undefined) {
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Credenciales inválidas: email y contraseña requeridos' });
        }

        try {
            const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email.trim().toLowerCase()]);
            const user = rows[0];

            if (!user || !user.password_hash) {
                return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
            }

            if (user.role !== 'admin' && user.role !== 'superadmin') {
                return res.status(403).json({ error: 'Solo administradores pueden autorizar el registro de nuevo personal.' });
            }

            // Aislamiento Multi-Tenant: El admin debe pertenecer al restaurante del contexto o ser superadmin
            if (user.role !== 'superadmin') {
                if (!req.tenant?.id) {
                    return res.status(400).json({
                        error: 'tenant_required',
                        message: 'El registro de personal debe realizarse desde el subdominio de tu restaurante (ej. demo.useeasyorder.com).'
                    });
                }

                if (!canUserAccessTenant(user.restaurant_id, user.role, req.tenant.id)) {
                    return res.status(403).json({
                        error: 'tenant_forbidden',
                        message: `No tienes permisos de administrador en el restaurante "${req.tenant.name}".`
                    });
                }
            }

            // Generar token temporal de administrador para autorizar la creación del usuario
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, restaurant_id: user.restaurant_id },
                process.env.JWT_SECRET || 'super_secret_jwt_key_for_easyorder',
                { expiresIn: '15m' }
            );

            return res.json({ status: 'ok', token, user: { id: user.id, email: user.email, role: user.role, restaurant_id: user.restaurant_id } });
        } catch (error: any) {
            return res.status(500).json({ error: 'Error del servidor al verificar credenciales' });
        }
    }

    // 2. Si se verifica vía Token JWT previo
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Credenciales o token de autenticación requeridos.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_easyorder', (err: any, user: any) => {
        if (err || !user) {
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Solo administradores.' });
        }
        return res.json({ status: 'ok', user });
    });
});

// Admin Crear Usuario / Staff con Aislamiento y Control de Cuota
router.post('/register', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Solo administradores pueden crear usuarios.' });
        }

        const validation = validateRegisterInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { email, password, fullName, role, restaurantId } = req.body;

        // Un admin estándar no puede crear superadmins
        if (role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'No tienes permisos para crear usuarios superadmin.' });
        }

        // Determinar restaurant_id asignado
        const targetRestaurantId = req.user.role === 'superadmin' && restaurantId
            ? restaurantId
            : (req.user.restaurant_id || req.tenant?.id);

        if (!targetRestaurantId && role !== 'superadmin') {
            return res.status(400).json({ error: 'Se requiere un restaurante válido para vincular al empleado.' });
        }

        // Validar límite de usuarios según el plan del restaurante (solo usuarios activos cuentan para el límite)
        if (targetRestaurantId && req.tenant?.plan?.max_users) {
            const countRes = await pool.query(
                'SELECT COUNT(*) FROM profiles WHERE restaurant_id = $1 AND (is_active = true OR is_active IS NULL)',
                [targetRestaurantId]
            );
            const currentCount = Number.parseInt(countRes.rows[0].count, 10);
            if (isUserLimitReached(currentCount, req.tenant.plan.max_users)) {
                return res.status(400).json({
                    error: 'user_limit_reached',
                    message: `Has alcanzado el límite máximo de ${req.tenant.plan.max_users} usuarios activos para tu plan actual.`
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            `INSERT INTO profiles (id, email, full_name, role, password_hash, is_logged_in, restaurant_id, is_active)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, $5, true)
             RETURNING id, email, full_name, role, restaurant_id, is_active, created_at`,
            [email.trim().toLowerCase(), fullName.trim(), role, hashedPassword, targetRestaurantId]
        );

        res.status(201).json({ status: 'ok', user: rows[0] });
    } catch (error: any) {
        if (error.code === '23505') { // Postgres unique constraint violation
            return res.status(409).json({ error: 'Ya existe un usuario con este correo electrónico.' });
        }
        res.status(500).json({ error: error.message || 'Error del servidor' });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
    try {
        await pool.query('UPDATE profiles SET is_logged_in = 0 WHERE id = $1', [req.user.id]);
        res.json({ status: 'ok', message: 'Sesión cerrada exitosamente' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al desloguearse' });
    }
});

// Cargar Staff (Aislado por Restaurante)
router.get('/staff', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Solo administradores.' });
        }

        const targetRestaurantId = req.user.role === 'superadmin' && !req.tenant?.id
            ? null
            : (req.user.restaurant_id || req.tenant?.id);

        const { status } = req.query;
        const whereClauses: string[] = [];
        const params: any[] = [];

        if (targetRestaurantId) {
            params.push(targetRestaurantId);
            whereClauses.push(`restaurant_id = $${params.length}`);
        }

        if (status === 'active') {
            whereClauses.push('(is_active = true OR is_active IS NULL)');
        } else if (status === 'inactive') {
            whereClauses.push('is_active = false');
        }

        let query = 'SELECT id, email, full_name, role, is_active, restaurant_id, created_at FROM profiles';
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        query += ' ORDER BY created_at DESC';

        let rows: any[] = [];
        try {
            const result = await pool.query(query, params);
            rows = result?.rows || [];
        } catch (dbErr: any) {
            // Si la columna is_active aún no existe en BD (Postgres 42703), auto-migrar y reintentar
            if (dbErr.code === '42703' || dbErr.message?.includes('is_active')) {
                await pool.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;');
                const result = await pool.query(query, params);
                rows = result?.rows || [];
            } else {
                throw dbErr;
            }
        }

        res.json(rows.map((r: any) => ({ ...r, is_active: r.is_active !== false })));
    } catch (error: any) {
        console.error('Error al obtener lista de personal:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Actualizar Rol y/o Estado Staff (Aislado por Restaurante)
router.patch('/staff/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { id } = req.params;
    const validation = validateStaffUpdate(req.body);
    if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
    }

    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Solo administradores.' });
        }

        const { role, isActive } = req.body;

        if (isActive === false && id === req.user.id) {
            return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta de administrador.' });
        }

        const targetRestaurantId = req.user.role === 'superadmin' ? null : (req.user.restaurant_id || req.tenant?.id);

        const setClauses: string[] = [];
        const params: any[] = [];

        if (role !== undefined) {
            params.push(role);
            setClauses.push(`role = $${params.length}`);
        }

        if (isActive !== undefined) {
            params.push(Boolean(isActive));
            setClauses.push(`is_active = $${params.length}`);
            if (isActive === false) {
                setClauses.push('is_logged_in = 0');
            }
        }

        params.push(id);
        let query = `UPDATE profiles SET ${setClauses.join(', ')} WHERE id = $${params.length}`;

        if (targetRestaurantId) {
            params.push(targetRestaurantId);
            query += ` AND restaurant_id = $${params.length}`;
        }

        query += ' RETURNING id, email, full_name, role, is_active, restaurant_id';

        const result = await pool.query(query, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado o no pertenece a tu restaurante.' });
        }

        res.json({ status: 'ok', user: result.rows?.[0] || null });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Eliminar o Desactivar Usuario Staff (Aislado por Restaurante con Preservación Contable)
router.delete('/staff/:id', authenticateToken, async (req: AuthRequest & TenantRequest, res) => {
    const { id } = req.params;

    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Solo administradores.' });
        }

        if (id === req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
        }

        const targetRestaurantId = req.user.role === 'superadmin' ? null : (req.user.restaurant_id || req.tenant?.id);

        // Verificar existencia y pertenencia al inquilino
        let checkQuery = 'SELECT id, email, full_name, restaurant_id FROM profiles WHERE id = $1';
        const checkParams: any[] = [id];
        if (targetRestaurantId) {
            checkQuery += ' AND restaurant_id = $2';
            checkParams.push(targetRestaurantId);
        }

        const { rows: userRows = [] } = await pool.query(checkQuery, checkParams);
        if (!userRows || userRows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado o no pertenece a tu restaurante.' });
        }

        // Comprobar si el usuario tiene registros vinculados en órdenes o turnos de caja
        const { rows: depRows } = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM orders WHERE server_id = $1) as order_count,
                (SELECT COUNT(*) FROM cash_register_sessions WHERE user_id = $1) as session_count
        `, [id]);

        const orderCount = Number.parseInt(depRows[0]?.order_count || '0', 10);
        const sessionCount = Number.parseInt(depRows[0]?.session_count || '0', 10);

        if (orderCount > 0 || sessionCount > 0) {
            // Desactivación segura (Soft Delete) para preservar la integridad de datos históricos
            await pool.query(
                'UPDATE profiles SET is_active = false, is_logged_in = 0 WHERE id = $1',
                [id]
            );

            return res.json({
                status: 'deactivated',
                action: 'deactivated',
                message: 'El empleado tiene historial de comandas o turnos de caja registrados. Para proteger la integridad contable, ha sido desactivado de forma segura y se le revocó el acceso.'
            });
        }

        // Eliminación física si no tiene historial asociado
        await pool.query('DELETE FROM profiles WHERE id = $1', [id]);

        res.json({
            status: 'ok',
            action: 'deleted',
            message: 'Usuario eliminado correctamente'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error del servidor' });
    }
});

// Cambiar Contraseña propia
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

export default router;

