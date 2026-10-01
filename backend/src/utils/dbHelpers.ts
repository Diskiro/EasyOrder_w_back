/**
 * SRP: Funciones de utilidad para construcción segura de consultas SQL con aislamiento multi-tenant
 */

export interface QueryWithParams {
    query: string;
    params: any[];
}

/**
 * Resuelve el restaurant_id objetivo considerando el rol del usuario y el contexto del inquilino
 */
export function extractTargetTenantId(
    user?: { role?: string; restaurant_id?: string | null },
    tenant?: { id?: string }
): string | null {
    if (user?.role === 'superadmin' && !tenant?.id) {
        return null;
    }
    return user?.restaurant_id || tenant?.id || null;
}

/**
 * Construye de forma dinámica una consulta UPDATE parametrizada con aislamiento de inquilino
 */
export function buildTenantUpdateQuery(
    tableName: string,
    id: string | number,
    updates: Record<string, any>,
    tenantId?: string | null
): QueryWithParams | null {
    const keys = Object.keys(updates);
    if (keys.length === 0) {
        return null;
    }

    const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ');
    const params: any[] = [id, ...keys.map(k => updates[k])];

    let query = `UPDATE "${tableName}" SET ${setClause} WHERE id = $1`;

    if (tenantId) {
        params.push(tenantId);
        query += ` AND restaurant_id = $${params.length}`;
    }

    query += ' RETURNING *';

    return { query, params };
}

/**
 * Construye de forma parametrizada una consulta DELETE con aislamiento de inquilino
 */
export function buildTenantDeleteQuery(
    tableName: string,
    id: string | number,
    tenantId?: string | null
): QueryWithParams {
    const params: any[] = [id];
    let query = `DELETE FROM "${tableName}" WHERE id = $1`;

    if (tenantId) {
        params.push(tenantId);
        query += ' AND restaurant_id = $2';
    }

    return { query, params };
}
