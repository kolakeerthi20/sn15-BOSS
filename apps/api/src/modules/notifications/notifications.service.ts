import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(tenantId: string, userId: string, query: any = {}) {
    const { page = 1, limit = 20, unreadOnly } = query;

    let sql = `
      SELECT n.*, u.first_name || ' ' || u.last_name AS actor_name, u.avatar_url AS actor_avatar
      FROM notifications n
      LEFT JOIN users u ON u.id = n.actor_id
      WHERE n.tenant_id = $1 AND n.recipient_id = $2
    `;
    const params: any[] = [tenantId, userId];

    if (unreadOnly === 'true') sql += ` AND n.is_read = false`;
    sql += ` ORDER BY n.created_at DESC`;

    return this.db.paginate(sql, params, Number(page), Number(limit));
  }

  async getUnreadCount(tenantId: string, userId: string) {
    const result = await this.db.queryOne(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE tenant_id = $1 AND recipient_id = $2 AND is_read = false`,
      [tenantId, userId],
    );
    return { count: parseInt(result.count, 10) };
  }

  async markAsRead(tenantId: string, userId: string, notificationId?: string) {
    if (notificationId) {
      await this.db.query(
        `UPDATE notifications SET is_read = true, read_at = NOW()
         WHERE id = $1 AND recipient_id = $2`,
        [notificationId, userId],
      );
    } else {
      await this.db.query(
        `UPDATE notifications SET is_read = true, read_at = NOW()
         WHERE tenant_id = $1 AND recipient_id = $2 AND is_read = false`,
        [tenantId, userId],
      );
    }
  }

  async create(data: {
    tenantId: string;
    recipientId: string;
    actorId?: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
  }) {
    return this.db.queryOne(
      `INSERT INTO notifications
         (tenant_id, recipient_id, actor_id, type, title, message,
          entity_type, entity_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.tenantId, data.recipientId, data.actorId || null,
        data.type, data.title, data.message,
        data.entityType || null, data.entityId || null,
        JSON.stringify(data.metadata || {}),
      ],
    );
  }
}
