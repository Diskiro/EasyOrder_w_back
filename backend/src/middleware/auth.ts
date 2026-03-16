import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];

    // Extraemos el token del header "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Falta el token de autenticación' });
        return;
    }

    jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_easyorder', (err, user) => {
        if (err) {
            res.status(403).json({ error: 'Token inválido o expirado' });
            return;
        }

        req.user = user;
        next();
    });
};
