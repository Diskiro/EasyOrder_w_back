/**
 * SRP: Validación estricta y reglas de negocio para usuarios, personal y asignación de inquilinos (Tenants)
 */

export interface RegisterUserInput {
    email?: string;
    password?: string;
    fullName?: string;
    role?: string;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

const ALLOWED_ROLES = ['admin', 'waiter', 'kitchen', 'superadmin'] as const;
export type UserRole = typeof ALLOWED_ROLES[number];

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Valida de forma estricta los datos de entrada para registrar un usuario
 */
export function validateRegisterInput(input: RegisterUserInput): ValidationResult {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Los datos del usuario son obligatorios' };
    }

    const { email, password, fullName, role } = input;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return { isValid: false, error: 'El correo electrónico no tiene un formato válido' };
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return { isValid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
        return { isValid: false, error: 'El nombre completo es obligatorio' };
    }

    if (!role || typeof role !== 'string' || !ALLOWED_ROLES.includes(role as UserRole)) {
        return { isValid: false, error: `El rol debe ser uno de los siguientes: ${ALLOWED_ROLES.join(', ')}` };
    }

    return { isValid: true };
}

/**
 * Valida si un rol a actualizar es válido para personal operativo
 */
export function validateRoleUpdate(role: unknown): ValidationResult {
    if (!role || typeof role !== 'string' || !['admin', 'waiter', 'kitchen'].includes(role)) {
        return { isValid: false, error: 'El rol especificado no es válido' };
    }
    return { isValid: true };
}

/**
 * Regla de negocio SRP: Determina si un usuario tiene autorización para acceder a un restaurante (Tenant)
 * @param userRestaurantId - ID del restaurante al que pertenece el usuario
 * @param userRole - Rol del usuario (superadmin tiene acceso global)
 * @param targetTenantId - ID del restaurante actual desde el que se realiza la petición
 */
export function canUserAccessTenant(
    userRestaurantId: string | null | undefined,
    userRole: string | undefined,
    targetTenantId: string | undefined
): boolean {
    // 1. El superadmin tiene acceso universal a cualquier restaurante
    if (userRole === 'superadmin') {
        return true;
    }

    // 2. Si no hay tenant específico en el contexto (ej. acceso global), se permite
    if (!targetTenantId) {
        return true;
    }

    // 3. El usuario debe pertenecer exactamente al mismo restaurante
    return Boolean(userRestaurantId && userRestaurantId === targetTenantId);
}

/**
 * Regla de negocio SRP: Valida si se ha alcanzado la cuota máxima de usuarios permitida por el plan
 */
export function isUserLimitReached(currentCount: number, maxUsers: number): boolean {
    if (typeof maxUsers !== 'number' || maxUsers <= 0) {
        return false;
    }
    return currentCount >= maxUsers;
}
