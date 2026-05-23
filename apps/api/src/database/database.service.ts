import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool, PoolClient, QueryResult } from 'pg';
import { PG_POOL } from './tokens';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(sql, params);
      const duration = Date.now() - start;
      if (duration > 200) {
        this.logger.warn(`Slow query (${duration}ms): ${sql.slice(0, 100)}`);
      }
      return result;
    } catch (err) {
      this.logger.error(`Query error: ${err.message}\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`);
      throw err;
    }
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows[0] ?? null;
  }

  async queryMany<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async paginate<T = any>(
    sql: string,
    params: any[],
    page: number,
    limit: number,
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS _count_query`;
    const dataSql = `${sql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const [countResult, dataResult] = await Promise.all([
      this.query(countSql, params),
      this.query<T>(dataSql, [...params, limit, offset]),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    return {
      data: dataResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
