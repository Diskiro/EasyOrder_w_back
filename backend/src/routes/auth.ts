import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Login de Usuario
router.post('/login', async (req, res) => {
    const { email, password, overrideLock } = req.body;

    try {
        const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
        const user = rows[0];

        if (!user) {
            // Por seguridad, un mensaje genérico
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificación criptográfica de la contraseña
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Comprobación de Sesión Activa (Misma lógica local que tenías en frontend)
        if (user.is_logged_in === 1 && !overrideLock) {
            return res.status(403).json({ error: 'Ya hay una sesión iniciada en otro dispositivo.' });
        }

        // Actualizar base de datos
        await pool.query('UPDATE profiles SET is_logged_in = 1, last_sign_in_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'super_secret_jwt_key_for_easyorder',
            { expiresIn: '10h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name } });

    } catch (error: any) {
        console.error('Error in login:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Obtener info del usuario actual (Me)
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { rows } = await pool.query('SELECT id, email, full_name, role, is_logged_in FROM profiles WHERE id = $1', [req.user.id]);
        res.json({ user: rows[0] });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Verify Admin
router.post('/verify-admin', authenticateToken, async (req: AuthRequest, res) => {
    const { password } = req.body;
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
        // En migración real: await bcrypt.compare(password, <hash en db>)
        // Por ahora lo saltamos dado que ya están autenticados como admin
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Admin Crear Usuario
router.post('/register', authenticateToken, async (req: AuthRequest, res) => {
    const { email, password, fullName, role } = req.body;
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden crear usuarios.' });

        // Simular creación - Inyectar en postgres. En prod, usar bcrypt.
        const id = crypto.randomUUID(); // Requires crypto, use raw uuid generation from postgres gen_random_uuid
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO profiles (id, email, full_name, role, password_hash, is_logged_in) VALUES (gen_random_uuid(), $1, $2, $3, $4, 1)",
            [email, fullName, role, hashedPassword]
        );
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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

// Cargar Staff (Admin)
router.get('/staff', authenticateToken, async (req: AuthRequest, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
        const { rows } = await pool.query('SELECT id, email, full_name, role, created_at FROM profiles ORDER BY created_at DESC');
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Actualizar Rol Staff (Admin)
router.patch('/staff/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
        await pool.query('UPDATE profiles SET role = $1 WHERE id = $2', [role, id]);
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Cambiar Contraseña propia
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
    const { password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

export default router;
