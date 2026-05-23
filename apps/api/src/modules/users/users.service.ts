import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(tenantId: string, query: any = {}) {
    const {
      page = 1, limit = 20, search, department, role, status = 'active',
    } = query;

    let sql = `
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.avatar_url,
        u.role, u.status, u.department, u.designation, u.phone,
        u.daily_capacity, u.is_billable, u.skills,
        u.last_login_at, u.created_at,
        m.first_name || ' ' || m.last_name AS manager_name,
        COUNT(DISTINCT pm.project_id) FILTER (WHERE pm.left_at IS NULL) AS active_projects,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('not_started','in_progress')) AS active_tasks
      FROM users u
      LEFT JOIN users m ON m.id = u.manager_id
      LEFT JOIN project_members pm ON pm.user_id = u.id
      LEFT JOIN tasks t ON t.assignee_id = u.id
      WHERE u.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (status) { sql += ` AND u.status = $${idx++}`; params.push(status); }
    if (department) { sql += ` AND u.department = $${idx++}`; params.push(department); }
    if (role) { sql += ` AND u.role = $${idx++}`; params.push(role); }
    if (search) {
      sql += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` GROUP BY u.id, m.first_name, m.last_name ORDER BY u.first_name, u.last_name`;

    return this.db.paginate(sql, params, Number(page), Number(limit));
  }

  async findById(tenantId: string, userId: string) {
    const user = await this.db.queryOne(
      `SELECT
         u.id, u.email, u.first_name, u.last_name, u.avatar_url,
         u.role, u.status, u.department, u.designation, u.phone,
         u.timezone, u.skills, u.hourly_rate, u.daily_capacity,
         u.is_billable, u.preferences, u.last_login_at, u.joined_at,
         u.created_at, u.updated_at,
         m.id AS manager_id, m.first_name || ' ' || m.last_name AS manager_name
       FROM users u
       LEFT JOIN users m ON m.id = u.manager_id
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [userId, tenantId],
    );
    if (!user) throw new NotFoundException('User not found');

    // Load assigned projects
    const projects = await this.db.queryMany(
      `SELECT p.id, p.name, p.status, p.color, pm.role, pm.allocation
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.user_id = $1 AND pm.left_at IS NULL`,
      [userId],
    );

    return { ...user, projects };
  }

  async update(tenantId: string, userId: string, dto: any) {
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const allowed = [
      'first_name', 'last_name', 'phone', 'department', 'designation',
      'timezone', 'skills', 'hourly_rate', 'daily_capacity', 'avatar_url',
      'preferences', 'manager_id', 'is_billable',
    ];

    for (const key of allowed) {
      if (dto[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(dto[key]);
      }
    }

    if (!fields.length) return this.findById(tenantId, userId);

    params.push(userId, tenantId);
    await this.db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1}`,
      params,
    );

    return this.findById(tenantId, userId);
  }

  async getDepartments(tenantId: string) {
    return this.db.queryMany(
      `SELECT DISTINCT department, COUNT(*) as user_count
       FROM users WHERE tenant_id = $1 AND department IS NOT NULL AND status = 'active'
       GROUP BY department ORDER BY department`,
      [tenantId],
    );
  }
}
