import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenant';

/**
 * Valida si la suscripción de un inquilino está activa y dentro de su periodo de validez
 * @param status - Estado del restaurante ('active', 'suspended', 'past_due')
 * @param expiresAt - Fecha ISO o Date de vencimiento de la suscripción
 * @param now - Fecha de referencia (por defecto la fecha actual)
 */
export function isSubscriptionValid(
    status: string | undefined,
    expiresAt: string | Date | undefined,
    now: Date = new Date()
): { valid: boolean; reason?: 'suspended' | 'expired' | 'missing' } {
    if (!status || !expiresAt) {
        return { valid: false, reason: 'missing' };
    }

    if (status === 'suspended') {
        return { valid: false, reason: 'suspended' };
    }

    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate.getTime() < now.getTime()) {
        return { valid: false, reason: 'expired' };
    }

    return { valid: true };
}

/**
 * Middleware SRP: Bloquea peticiones de restaurantes con suscripción suspendida o vencida
 */
export const requireActiveSubscription = (req: TenantRequest, res: Response, next: NextFunction): void => {
    // Si no hay inquilino detectado en la petición, pasar al siguiente middleware
    if (!req.tenant) {
        return next();
    }

    const check = isSubscriptionValid(req.tenant.status, req.tenant.subscription_expires_at);

    if (!check.valid) {
        if (check.reason === 'suspended') {
            res.status(402).json({
                error: 'subscription_suspended',
                message: 'El acceso para este restaurante ha sido suspendido por el administrador.'
            });
            return;
        }

        if (check.reason === 'expired') {
            res.status(402).json({
                error: 'subscription_expired',
                message: 'La suscripción de este restaurante ha vencido. Por favor renueva tu plan para continuar operando.'
            });
            return;
        }

        res.status(402).json({
            error: 'subscription_invalid',
            message: 'Estado de suscripción no válido.'
        });
        return;
    }

    next();
};
