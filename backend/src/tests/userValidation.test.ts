import {
    validateRegisterInput,
    validateRoleUpdate,
    canUserAccessTenant,
    isUserLimitReached
} from '../utils/userValidation';

describe('User Validation & Multi-Tenant Rules (SRP)', () => {
    describe('validateRegisterInput', () => {
        it('debe validar exitosamente un usuario con datos válidos', () => {
            const result = validateRegisterInput({
                email: 'mesero@demo.com',
                password: 'password123',
                fullName: 'Juan Perez',
                role: 'waiter'
            });
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('debe fallar si el email es inválido', () => {
            const result = validateRegisterInput({
                email: 'invalid-email',
                password: 'password123',
                fullName: 'Juan Perez',
                role: 'waiter'
            });
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('correo electrónico');
        });

        it('debe fallar si la contraseña tiene menos de 6 caracteres', () => {
            const result = validateRegisterInput({
                email: 'test@demo.com',
                password: '123',
                fullName: 'Juan Perez',
                role: 'waiter'
            });
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('al menos 6 caracteres');
        });

        it('debe fallar si el nombre está vacío', () => {
            const result = validateRegisterInput({
                email: 'test@demo.com',
                password: 'password123',
                fullName: '   ',
                role: 'waiter'
            });
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('nombre completo');
        });

        it('debe fallar si el rol no está en el catálogo permitido', () => {
            const result = validateRegisterInput({
                email: 'test@demo.com',
                password: 'password123',
                fullName: 'Juan Perez',
                role: 'hacker'
            });
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('rol');
        });

        it('debe fallar si el objeto de entrada es nulo o indefinido', () => {
            const result = validateRegisterInput(null as any);
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateRoleUpdate', () => {
        it('debe aceptar roles permitidos (admin, waiter, kitchen)', () => {
            expect(validateRoleUpdate('admin').isValid).toBe(true);
            expect(validateRoleUpdate('waiter').isValid).toBe(true);
            expect(validateRoleUpdate('kitchen').isValid).toBe(true);
        });

        it('debe rechazar roles inválidos o no permitidos', () => {
            expect(validateRoleUpdate('superadmin').isValid).toBe(false);
            expect(validateRoleUpdate('invitado').isValid).toBe(false);
            expect(validateRoleUpdate(null).isValid).toBe(false);
        });
    });

    describe('canUserAccessTenant', () => {
        const tenantA = 'tenant-uuid-111';
        const tenantB = 'tenant-uuid-222';

        it('debe permitir acceso a superadmin en cualquier tenant', () => {
            expect(canUserAccessTenant(tenantA, 'superadmin', tenantB)).toBe(true);
            expect(canUserAccessTenant(null, 'superadmin', tenantA)).toBe(true);
        });

        it('debe permitir acceso si no hay tenant específico configurado', () => {
            expect(canUserAccessTenant(tenantA, 'admin', undefined)).toBe(true);
        });

        it('debe permitir acceso si el usuario pertenece al mismo tenant', () => {
            expect(canUserAccessTenant(tenantA, 'admin', tenantA)).toBe(true);
            expect(canUserAccessTenant(tenantA, 'waiter', tenantA)).toBe(true);
        });

        it('debe denegar acceso si el usuario pertenece a otro restaurante', () => {
            expect(canUserAccessTenant(tenantA, 'admin', tenantB)).toBe(false);
            expect(canUserAccessTenant(tenantA, 'waiter', tenantB)).toBe(false);
            expect(canUserAccessTenant(null, 'admin', tenantB)).toBe(false);
        });
    });

    describe('isUserLimitReached', () => {
        it('debe retornar true si el conteo actual alcanza o supera el límite', () => {
            expect(isUserLimitReached(3, 3)).toBe(true);
            expect(isUserLimitReached(4, 3)).toBe(true);
        });

        it('debe retornar false si el conteo actual es menor al límite', () => {
            expect(isUserLimitReached(2, 3)).toBe(false);
        });

        it('debe manejar límites no numéricos o sin límite', () => {
            expect(isUserLimitReached(10, 0)).toBe(false);
            expect(isUserLimitReached(10, -1)).toBe(false);
        });
    });
});
