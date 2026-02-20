import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
    console.warn('[DB] DATABASE_URL is not set. Database calls will fail.');
}

export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,                  // max pool connections
    idleTimeoutMillis: 30000, // close idle clients after 30s
    connectionTimeoutMillis: 5000, // fail fast if can't connect
});

// Test connection on startup
db.on('connect', () => {
    console.log('[DB] PostgreSQL client connected');
});

db.on('error', (err) => {
    console.error('[DB] Unexpected PostgreSQL error:', err.message);
});

/**
 * Helper: run a query and return rows
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const client = await db.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows as T[];
    } finally {
        client.release();
    }
}

/**
 * Helper: run a query and return the first row or null
 */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows[0] ?? null;
}

/**
 * Helper: run a query inside a transaction
 */
export async function withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
