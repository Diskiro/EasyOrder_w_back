import { Response, NextFunction } from 'express';
import { TenantRequest, TenantInfo } from './tenant';

export type PlanFeature = keyof TenantInfo['plan'];

/**
 * Valida si un objeto de plan tiene habilitada una característica específica
 */
export function hasFeatureEnabled(plan: TenantInfo['plan'] | undefined, feature: PlanFeature): boolean {
    if (!plan) return false;
    return Boolean(plan[feature]);
}

/**
 * Generador de middleware SRP: Restringe el acceso a endpoints según el plan contratado
 * @param feature - Nombre del módulo/característica a verificar
 */
export const requireFeature = (feature: PlanFeature) => {
    return (req: TenantRequest, res: Response, next: NextFunction): void => {
        if (!req.tenant) {
            return next();
        }

        if (!hasFeatureEnabled(req.tenant.plan, feature)) {
            res.status(403).json({
                error: 'feature_not_included',
                feature,
                message: `El plan actual de este restaurante no incluye acceso al módulo "${feature}". Actualiza tu suscripción para desbloquearlo.`
            });
            return;
        }

        next();
    };
};
