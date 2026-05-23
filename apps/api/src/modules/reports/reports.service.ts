import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getExecutiveDashboard(tenantId: string) {
    const [projectStats, resourceStats, taskStats, recentActivity] = await Promise.all([
      this.db.queryOne(
        `SELECT
           COUNT(*) AS total_projects,
           COUNT(*) FILTER (WHERE status = 'active') AS active_projects,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed_projects,
           COUNT(*) FILTER (WHERE health = 'at_risk') AS at_risk_projects,
           COUNT(*) FILTER (WHERE health = 'off_track') AS off_track_projects,
           COUNT(*) FILTER (WHERE end_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS delayed_projects,
           ROUND(AVG(completion_pct), 1) AS avg_completion,
           SUM(budget) AS total_budget,
           SUM(budget_spent) AS total_spent
         FROM projects WHERE tenant_id = $1 AND archived_at IS NULL`,
        [tenantId],
      ),
      this.db.queryOne(
        `SELECT
           COUNT(*) AS total_resources,
           COUNT(*) FILTER (WHERE status = 'active') AS active_resources,
           ROUND(AVG(
             COALESCE((
               SELECT SUM(hours) FROM task_time_entries tte
               WHERE tte.user_id = u.id AND tte.date >= CURRENT_DATE - INTERVAL '7 days'
             ), 0) / NULLIF(daily_capacity * 5, 0) * 100
           ), 1) AS avg_utilization_pct
         FROM users u WHERE tenant_id = $1`,
        [tenantId],
      ),
      this.db.queryOne(
        `SELECT
           COUNT(*) AS total_tasks,
           COUNT(*) FILTER (WHERE status IN ('not_started','in_progress')) AS active_tasks,
           COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_tasks,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
           COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS overdue_tasks,
           ROUND(AVG(progress_pct), 1) AS avg_progress
         FROM tasks WHERE tenant_id = $1`,
        [tenantId],
      ),
      this.db.queryMany(
        `SELECT al.*, u.first_name || ' ' || u.last_name AS actor_name, u.avatar_url
         FROM activity_logs al LEFT JOIN users u ON u.id = al.actor_id
         WHERE al.tenant_id = $1
         ORDER BY al.created_at DESC LIMIT 10`,
        [tenantId],
      ),
    ]);

    return { projectStats, resourceStats, taskStats, recentActivity };
  }

  async getProjectVelocity(tenantId: string, projectId: string) {
    return this.db.queryMany(
      `SELECT
         s.id, s.name, s.start_date, s.end_date, s.status,
         COUNT(t.id) AS total_tasks,
         COUNT(t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
         SUM(t.story_points) AS total_points,
         SUM(t.story_points) FILTER (WHERE t.status = 'completed') AS completed_points,
         SUM(t.estimated_hours) AS estimated_hours,
         SUM(t.logged_hours) AS logged_hours
       FROM sprints s
       LEFT JOIN tasks t ON t.sprint_id = s.id
       WHERE s.project_id = $1
       GROUP BY s.id
       ORDER BY s.start_date`,
      [projectId],
    );
  }

  async getResourceUtilization(tenantId: string, query: any = {}) {
    const { startDate, endDate, department } = query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    let sql = `
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.avatar_url,
        u.department, u.designation, u.daily_capacity,
        COALESCE(SUM(tte.hours), 0) AS total_logged_hours,
        ($2::date - $1::date) AS total_days,
        ROUND(
          COALESCE(SUM(tte.hours), 0) /
          NULLIF(u.daily_capacity * ($2::date - $1::date)::numeric, 0) * 100, 1
        ) AS utilization_pct,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('not_started','in_progress')) AS active_tasks,
        COUNT(DISTINCT pm.project_id) AS active_projects
      FROM users u
      LEFT JOIN task_time_entries tte ON tte.user_id = u.id
        AND tte.date BETWEEN $1 AND $2
      LEFT JOIN tasks t ON t.assignee_id = u.id AND t.status IN ('not_started','in_progress')
      LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.left_at IS NULL
      WHERE u.tenant_id = $3 AND u.status = 'active'
    `;
    const params: any[] = [start, end, tenantId];
    let idx = 4;

    if (department) { sql += ` AND u.department = $${idx++}`; params.push(department); }
    sql += ` GROUP BY u.id ORDER BY utilization_pct DESC`;

    return this.db.queryMany(sql, params);
  }

  async getEmployeeContributionReport(tenantId: string, userId: string, query: any = {}) {
    const { startDate, endDate } = query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const [summary, dailyBreakdown, projectBreakdown, taskCompletion] = await Promise.all([
      this.db.queryOne(
        `SELECT
           COALESCE(SUM(dl.hours_spent), 0) AS total_hours,
           COUNT(DISTINCT dl.log_date) FILTER (WHERE dl.is_submitted) AS days_logged,
           COUNT(DISTINCT dl.project_id) AS projects_contributed,
           AVG(dl.mood_score) AS avg_mood,
           COUNT(t.id) FILTER (WHERE t.status = 'completed') AS tasks_completed
         FROM users u
         LEFT JOIN daily_logs dl ON dl.user_id = u.id
           AND dl.log_date BETWEEN $2 AND $3
         LEFT JOIN tasks t ON t.assignee_id = u.id
           AND t.completed_at BETWEEN $2::timestamptz AND $3::timestamptz
         WHERE u.id = $1`,
        [userId, start, end],
      ),
      this.db.queryMany(
        `SELECT log_date, SUM(hours_spent) AS hours, is_submitted
         FROM daily_logs
         WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
         GROUP BY log_date, is_submitted ORDER BY log_date`,
        [userId, start, end],
      ),
      this.db.queryMany(
        `SELECT p.id, p.name, p.color,
                SUM(dl.hours_spent) AS hours_logged,
                COUNT(DISTINCT dl.log_date) AS days_active
         FROM daily_logs dl
         JOIN projects p ON p.id = dl.project_id
         WHERE dl.user_id = $1 AND dl.log_date BETWEEN $2 AND $3
         GROUP BY p.id ORDER BY hours_logged DESC`,
        [userId, start, end],
      ),
      this.db.queryMany(
        `SELECT t.id, t.title, t.status, t.priority, t.progress_pct,
                t.estimated_hours, t.logged_hours, t.completed_at,
                p.name AS project_name, p.color AS project_color
         FROM tasks t JOIN projects p ON p.id = t.project_id
         WHERE t.assignee_id = $1
           AND (t.completed_at BETWEEN $2::timestamptz AND $3::timestamptz
                OR t.status IN ('in_progress','blocked'))
         ORDER BY t.completed_at DESC NULLS LAST`,
        [userId, start, end],
      ),
    ]);

    return { summary, dailyBreakdown, projectBreakdown, taskCompletion };
  }

  async getBurndownChart(tenantId: string, sprintId: string) {
    const sprint = await this.db.queryOne(
      'SELECT * FROM sprints WHERE id = $1', [sprintId],
    );
    if (!sprint) return null;

    return this.db.queryMany(
      `WITH dates AS (
         SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS date
       ),
       daily_completed AS (
         SELECT
           DATE(t.completed_at) AS date,
           SUM(COALESCE(t.story_points, 1)) AS points_completed
         FROM tasks t
         WHERE t.sprint_id = $3 AND t.status = 'completed'
           AND t.completed_at IS NOT NULL
         GROUP BY DATE(t.completed_at)
       ),
       total_points AS (
         SELECT SUM(COALESCE(story_points, 1)) AS total FROM tasks WHERE sprint_id = $3
       )
       SELECT
         d.date,
         tp.total AS total_points,
         tp.total - COALESCE(SUM(dc.points_completed) OVER (ORDER BY d.date), 0) AS remaining_points,
         CASE
           WHEN tp.total > 0 THEN
             tp.total - (tp.total / NULLIF($4::numeric, 0)) * (d.date - $1::date)
           ELSE 0
         END AS ideal_remaining
       FROM dates d
       CROSS JOIN total_points tp
       LEFT JOIN daily_completed dc ON dc.date = d.date
       ORDER BY d.date`,
      [
        sprint.start_date,
        sprint.end_date,
        sprintId,
        (new Date(sprint.end_date).getTime() - new Date(sprint.start_date).getTime()) / (1000 * 60 * 60 * 24),
      ],
    );
  }

  async getTimeReport(tenantId: string, query: any = {}) {
    const { startDate, endDate, projectId, userId, groupBy = 'user' } = query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const groupFields = groupBy === 'project'
      ? 'p.id, p.name, p.color'
      : 'u.id, u.first_name || \' \' || u.last_name AS name, u.avatar_url';

    let sql = `
      SELECT
        ${groupFields},
        SUM(tte.hours) AS total_hours,
        SUM(tte.hours) FILTER (WHERE tte.is_billable) AS billable_hours,
        SUM(tte.hours) FILTER (WHERE NOT tte.is_billable) AS non_billable_hours,
        COUNT(DISTINCT tte.user_id) AS contributors,
        COUNT(DISTINCT t.project_id) AS projects
      FROM task_time_entries tte
      JOIN tasks t ON t.id = tte.task_id
      JOIN projects p ON p.id = t.project_id
      JOIN users u ON u.id = tte.user_id
      WHERE p.tenant_id = $1 AND tte.date BETWEEN $2 AND $3
    `;
    const params: any[] = [tenantId, start, end];
    let idx = 4;

    if (projectId) { sql += ` AND t.project_id = $${idx++}`; params.push(projectId); }
    if (userId) { sql += ` AND tte.user_id = $${idx++}`; params.push(userId); }

    if (groupBy === 'project') sql += ` GROUP BY p.id ORDER BY total_hours DESC`;
    else sql += ` GROUP BY u.id, u.first_name, u.last_name, u.avatar_url ORDER BY total_hours DESC`;

    return this.db.queryMany(sql, params);
  }

  async getOverdueTasksReport(tenantId: string) {
    return this.db.queryMany(
      `SELECT
         t.id, t.title, t.priority, t.status, t.due_date, t.progress_pct,
         CURRENT_DATE - t.due_date AS days_overdue,
         p.id AS project_id, p.name AS project_name, p.color AS project_color,
         u.id AS assignee_id, u.first_name || ' ' || u.last_name AS assignee_name,
         u.avatar_url AS assignee_avatar, u.email AS assignee_email
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.tenant_id = $1
         AND t.due_date < CURRENT_DATE
         AND t.status NOT IN ('completed', 'cancelled')
       ORDER BY t.due_date, t.priority DESC`,
      [tenantId],
    );
  }

  async getBottleneckAnalysis(tenantId: string, projectId?: string) {
    let where = 'WHERE t.tenant_id = $1 AND t.status = \'blocked\'';
    const params: any[] = [tenantId];
    if (projectId) { where += ' AND t.project_id = $2'; params.push(projectId); }

    return this.db.queryMany(
      `SELECT
         t.id, t.title, t.priority, t.due_date,
         CURRENT_DATE - (
           SELECT MAX(al.created_at::date) FROM activity_logs al
           WHERE al.entity_id = t.id AND al.action = 'status_changed'
         ) AS days_blocked,
         p.name AS project_name,
         u.first_name || ' ' || u.last_name AS assignee_name,
         (SELECT dl.blockers FROM daily_logs dl WHERE dl.task_id = t.id ORDER BY dl.log_date DESC LIMIT 1) AS latest_blocker
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       ${where}
       ORDER BY t.priority DESC, t.due_date`,
      params,
    );
  }
}
