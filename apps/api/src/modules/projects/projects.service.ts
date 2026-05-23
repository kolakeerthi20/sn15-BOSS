import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(tenantId: string, userId: string, role: string, query: any = {}) {
    const { page = 1, limit = 20, status, priority, search, myProjects } = query;

    let sql = `
      SELECT
        p.id, p.name, p.code, p.description, p.status, p.priority, p.health,
        p.start_date, p.end_date, p.completion_pct, p.budget, p.budget_spent,
        p.estimated_hours, p.logged_hours, p.color, p.tags, p.created_at, p.updated_at,
        c.name AS client_name,
        u.first_name || ' ' || u.last_name AS owner_name,
        u.avatar_url AS owner_avatar,
        COUNT(DISTINCT pm2.user_id) AS team_size,
        COUNT(DISTINCT t.id) AS total_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('completed','cancelled')) AS overdue_tasks
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN users u ON u.id = p.owner_id
      LEFT JOIN project_members pm2 ON pm2.project_id = p.id AND pm2.left_at IS NULL
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.tenant_id = $1 AND p.archived_at IS NULL
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (role === 'employee') {
      sql += ` AND EXISTS (SELECT 1 FROM project_members pm3 WHERE pm3.project_id = p.id AND pm3.user_id = $${idx} AND pm3.left_at IS NULL)`;
      params.push(userId);
      idx++;
    } else if (myProjects === 'true') {
      sql += ` AND (p.owner_id = $${idx} OR EXISTS (SELECT 1 FROM project_members pm3 WHERE pm3.project_id = p.id AND pm3.user_id = $${idx}))`;
      params.push(userId);
      idx++;
    }

    if (status) { sql += ` AND p.status = $${idx++}`; params.push(status); }
    if (priority) { sql += ` AND p.priority = $${idx++}`; params.push(priority); }
    if (search) {
      sql += ` AND (p.name ILIKE $${idx} OR p.code ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` GROUP BY p.id, c.name, u.first_name, u.last_name, u.avatar_url`;
    sql += ` ORDER BY p.updated_at DESC`;

    return this.db.paginate(sql, params, Number(page), Number(limit));
  }

  async findById(tenantId: string, projectId: string, userId: string, role: string) {
    const project = await this.db.queryOne(
      `SELECT p.*, c.name AS client_name, c.email AS client_email,
              u.first_name || ' ' || u.last_name AS owner_name, u.avatar_url AS owner_avatar
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1 AND p.tenant_id = $2 AND p.archived_at IS NULL`,
      [projectId, tenantId],
    );
    if (!project) throw new NotFoundException('Project not found');

    const [members, milestones, sprints, recentActivity] = await Promise.all([
      this.db.queryMany(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.designation,
                pm.role, pm.allocation, pm.joined_at
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1 AND pm.left_at IS NULL`,
        [projectId],
      ),
      this.db.queryMany(
        `SELECT * FROM milestones WHERE project_id = $1 ORDER BY due_date`,
        [projectId],
      ),
      this.db.queryMany(
        `SELECT * FROM sprints WHERE project_id = $1 ORDER BY start_date DESC LIMIT 5`,
        [projectId],
      ),
      this.db.queryMany(
        `SELECT al.*, u.first_name || ' ' || u.last_name AS actor_name, u.avatar_url AS actor_avatar
         FROM activity_logs al
         LEFT JOIN users u ON u.id = al.actor_id
         WHERE al.entity_type = 'project' AND al.entity_id = $1
         ORDER BY al.created_at DESC LIMIT 20`,
        [projectId],
      ),
    ]);

    return { ...project, members, milestones, sprints, recentActivity };
  }

  async create(tenantId: string, userId: string, dto: CreateProjectDto) {
    return this.db.transaction(async (client) => {
      const project = await client.query(
        `INSERT INTO projects
           (tenant_id, client_id, name, description, code, status, priority,
            start_date, end_date, budget, estimated_hours, color, tags, created_by, owner_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
         RETURNING *`,
        [
          tenantId, dto.clientId ?? null, dto.name, dto.description ?? null, dto.code ?? null,
          dto.status || 'planning', dto.priority || 'medium',
          dto.startDate ?? null, dto.endDate ?? null, dto.budget ?? null, dto.estimatedHours ?? null,
          dto.color || '#6366f1', dto.tags || [], userId,
        ],
      );

      const proj = project.rows[0];

      // Add creator as project manager member
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role, allocation, added_by)
         VALUES ($1, $2, 'manager', 100, $2)`,
        [proj.id, userId],
      );

      // Add other members if specified
      if (dto.memberIds?.length) {
        for (const memberId of dto.memberIds) {
          if (memberId !== userId) {
            await client.query(
              `INSERT INTO project_members (project_id, user_id, role, allocation, added_by)
               VALUES ($1, $2, 'member', 100, $3) ON CONFLICT DO NOTHING`,
              [proj.id, memberId, userId],
            );
          }
        }
      }

      // Log activity
      await client.query(
        `INSERT INTO activity_logs (tenant_id, actor_id, entity_type, entity_id, action, new_values)
         VALUES ($1, $2, 'project', $3, 'created', $4)`,
        [tenantId, userId, proj.id, JSON.stringify({ name: proj.name, status: proj.status })],
      );

      return proj;
    });
  }

  async update(tenantId: string, projectId: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.db.queryOne(
      'SELECT id, owner_id FROM projects WHERE id = $1 AND tenant_id = $2',
      [projectId, tenantId],
    );
    if (!project) throw new NotFoundException('Project not found');

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      name: 'name', description: 'description', status: 'status',
      priority: 'priority', health: 'health', startDate: 'start_date',
      endDate: 'end_date', budget: 'budget', estimatedHours: 'estimated_hours',
      color: 'color', tags: 'tags', clientId: 'client_id', ownerId: 'owner_id',
    };

    for (const [dtoKey, dbCol] of Object.entries(fieldMap)) {
      if ((dto as any)[dtoKey] !== undefined) {
        fields.push(`${dbCol} = $${idx++}`);
        params.push((dto as any)[dtoKey]);
      }
    }

    if (!fields.length) return project;

    params.push(projectId, tenantId);
    const updated = await this.db.queryOne(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
      params,
    );

    await this.db.query(
      `INSERT INTO activity_logs (tenant_id, actor_id, entity_type, entity_id, action, new_values)
       VALUES ($1, $2, 'project', $3, 'updated', $4)`,
      [tenantId, userId, projectId, JSON.stringify(dto)],
    );

    return updated;
  }

  async addMember(tenantId: string, projectId: string, data: { userId: string; role?: string; allocation?: number }, addedBy: string) {
    await this.db.query(
      `INSERT INTO project_members (project_id, user_id, role, allocation, added_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, user_id) DO UPDATE SET left_at = NULL, role = $3, allocation = $4`,
      [projectId, data.userId, data.role || 'member', data.allocation || 100, addedBy],
    );
  }

  async removeMember(projectId: string, userId: string) {
    await this.db.query(
      `UPDATE project_members SET left_at = NOW() WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId],
    );
  }

  async getProjectStats(tenantId: string, projectId: string) {
    const [taskStats, timeStats, memberStats] = await Promise.all([
      this.db.queryOne(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'not_started') AS not_started,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
           COUNT(*) FILTER (WHERE status = 'blocked') AS blocked,
           COUNT(*) FILTER (WHERE status = 'in_review') AS in_review,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed,
           COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
           COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS overdue,
           AVG(progress_pct) AS avg_progress
         FROM tasks WHERE project_id = $1`,
        [projectId],
      ),
      this.db.queryMany(
        `SELECT
           DATE_TRUNC('week', tte.date) AS week,
           SUM(tte.hours) AS hours,
           COUNT(DISTINCT tte.user_id) AS contributors
         FROM task_time_entries tte
         JOIN tasks t ON t.id = tte.task_id
         WHERE t.project_id = $1
         GROUP BY DATE_TRUNC('week', tte.date)
         ORDER BY week DESC LIMIT 12`,
        [projectId],
      ),
      this.db.queryMany(
        `SELECT
           u.id, u.first_name, u.last_name, u.avatar_url, u.designation,
           COALESCE(SUM(tte.hours), 0) AS total_hours,
           COUNT(DISTINCT t.id) AS assigned_tasks,
           COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         LEFT JOIN tasks t ON t.assignee_id = u.id AND t.project_id = $1
         LEFT JOIN task_time_entries tte ON tte.user_id = u.id AND tte.task_id = t.id
         WHERE pm.project_id = $1 AND pm.left_at IS NULL
         GROUP BY u.id ORDER BY total_hours DESC`,
        [projectId],
      ),
    ]);

    return { taskStats, timeStats, memberStats };
  }

  async delete(tenantId: string, projectId: string) {
    await this.db.query(
      `UPDATE projects SET archived_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [projectId, tenantId],
    );
  }
}
