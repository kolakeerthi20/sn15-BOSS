import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ResourcesService {
  constructor(private readonly db: DatabaseService) {}

  async getCapacityPlanning(tenantId: string, startDate: string, endDate: string) {
    return this.db.queryMany(
      `SELECT
         u.id, u.first_name, u.last_name, u.avatar_url, u.department, u.daily_capacity,
         ($2::date - $1::date + 1) * u.daily_capacity AS total_capacity,
         COALESCE(SUM(ra.allocated_hours), 0) AS allocated_hours,
         ROUND(
           COALESCE(SUM(ra.allocated_hours), 0) /
           NULLIF(($2::date - $1::date + 1) * u.daily_capacity, 0) * 100, 1
         ) AS allocation_pct
       FROM users u
       LEFT JOIN resource_allocations ra ON ra.user_id = u.id
         AND ra.start_date <= $2 AND (ra.end_date IS NULL OR ra.end_date >= $1)
         AND ra.is_active = true
       WHERE u.tenant_id = $3 AND u.status = 'active'
       GROUP BY u.id
       ORDER BY allocation_pct DESC NULLS LAST`,
      [startDate, endDate, tenantId],
    );
  }

  async allocate(tenantId: string, data: {
    userId: string;
    projectId: string;
    allocatedHours: number;
    allocationPct: number;
    startDate: string;
    endDate?: string;
    roleOnProject?: string;
  }, createdBy: string) {
    return this.db.queryOne(
      `INSERT INTO resource_allocations
         (tenant_id, user_id, project_id, allocated_hours, allocation_pct,
          start_date, end_date, role_on_project, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        tenantId, data.userId, data.projectId, data.allocatedHours,
        data.allocationPct, data.startDate, data.endDate || null,
        data.roleOnProject || null, createdBy,
      ],
    );
  }

  async getWorkloadMatrix(tenantId: string, weeks = 4) {
    return this.db.queryMany(
      `SELECT
         u.id AS user_id,
         u.first_name || ' ' || u.last_name AS full_name,
         u.avatar_url, u.department, u.daily_capacity,
         p.id AS project_id, p.name AS project_name, p.color AS project_color,
         COUNT(t.id) AS tasks,
         SUM(t.estimated_hours - t.logged_hours) AS remaining_hours
       FROM users u
       JOIN project_members pm ON pm.user_id = u.id AND pm.left_at IS NULL
       JOIN projects p ON p.id = pm.project_id AND p.status = 'active'
       JOIN tasks t ON t.assignee_id = u.id AND t.project_id = p.id
         AND t.status IN ('not_started', 'in_progress')
         AND t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 * 7 || ' days')::INTERVAL
       WHERE u.tenant_id = $2 AND u.status = 'active'
       GROUP BY u.id, p.id
       ORDER BY u.first_name, remaining_hours DESC`,
      [weeks, tenantId],
    );
  }

  async getSkillMatrix(tenantId: string) {
    return this.db.queryMany(
      `SELECT
         u.id, u.first_name, u.last_name, u.email, u.avatar_url,
         u.department, u.designation, u.skills,
         COUNT(DISTINCT pm.project_id) AS total_projects,
         COUNT(DISTINCT t.id) AS total_tasks
       FROM users u
       LEFT JOIN project_members pm ON pm.user_id = u.id
       LEFT JOIN tasks t ON t.assignee_id = u.id
       WHERE u.tenant_id = $1 AND u.status = 'active'
         AND array_length(u.skills, 1) > 0
       GROUP BY u.id
       ORDER BY u.first_name`,
      [tenantId],
    );
  }
}
