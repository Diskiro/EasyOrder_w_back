import { Response } from 'express';
import { pool } from '../config/db';

/**
 * SRP: Funciones de utilidad para construcción y ejecución de consultas SQL con aislamiento multi-tenant
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

/**
 * SRP: Recupera registros de una tabla filtrados por inquilino y ordenamiento
 */
export async function fetchTenantRecords(
    res: Response,
    tableName: string,
    orderBy: string,
    tenantId: string | null,
    baseWhere: string = ''
): Promise<void> {
    try {
        let query = `SELECT * FROM "${tableName}"`;
        const params: any[] = [];
        const whereClauses: string[] = [];

        if (baseWhere) {
            whereClauses.push(baseWhere);
        }

        if (tenantId) {
            params.push(tenantId);
            whereClauses.push(`restaurant_id = $${params.length}`);
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ` ORDER BY ${orderBy}`;
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * SRP: Ejecuta de forma segura un UPDATE multi-tenant y envía la respuesta HTTP adecuada
 */
export async function executeTenantUpdate(
    res: Response,
    tableName: string,
    id: string,
    body: Record<string, any>,
    tenantId: string | null,
    notFoundMsg: string
): Promise<void> {
    const helper = buildTenantUpdateQuery(tableName, id, body, tenantId);
    if (!helper) {
        res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        return;
    }

    try {
        const { rows } = await pool.query(helper.query, helper.params);
        if (rows.length === 0) {
            res.status(404).json({ error: notFoundMsg });
            return;
        }
        res.json(rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * SRP: Ejecuta de forma segura un DELETE multi-tenant y envía la respuesta HTTP adecuada
 */
export async function executeTenantDelete(
    res: Response,
    tableName: string,
    id: string,
    tenantId: string | null,
    notFoundMsg: string
): Promise<void> {
    const helper = buildTenantDeleteQuery(tableName, id, tenantId);
    try {
        const result = await pool.query(helper.query, helper.params);
        if (result.rowCount === 0) {
            res.status(404).json({ error: notFoundMsg });
            return;
        }
        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
