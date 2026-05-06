import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const pool: Pool =
  globalThis._pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== 'production') globalThis._pgPool = pool;

export default pool;

// ── Query helpers ─────────────────────────────────────────────

export async function query<T = Record<string, any>>(
  text: string,
  params?: any[],
): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

export async function queryOne<T = Record<string, any>>(
  text: string,
  params?: any[],
): Promise<T | null> {
  const { rows } = await pool.query(text, params);
  return (rows[0] as T) ?? null;
}

// Convert a snake_case DB row to camelCase keys
export function toCamel<T = Record<string, any>>(row: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = v;
  }
  return out as T;
}

export function toCamelAll<T = Record<string, any>>(
  rows: Record<string, any>[],
): T[] {
  return rows.map(toCamel) as T[];
}
