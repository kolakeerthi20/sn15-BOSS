import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';

@Injectable()
export class DailyLogsService {
  private readonly logger = new Logger(DailyLogsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(tenantId: string, userId: string, role: string, query: any = {}) {
    const { page = 1, limit = 20, date, projectId, logUserId, logState, search } = query;

    let sql = `
      SELECT
        dl.id, dl.user_id, dl.project_id, dl.task_id, dl.log_date,
        dl.status, dl.work_done, dl.hours_spent, dl.progress_pct,
        dl.blockers, dl.tomorrows_plan, dl.mood_score,
        dl.is_submitted, dl.submitted_at, dl.created_at, dl.updated_at,
        u.first_name || ' ' || u.last_name AS user_name, u.avatar_url, u.department,
        p.name AS project_name, p.color AS project_color,
        t.title AS task_title,
        rv.first_name || ' ' || rv.last_name AS reviewer_name
      FROM daily_logs dl
      JOIN users u ON u.id = dl.user_id
      LEFT JOIN projects p ON p.id = dl.project_id
      LEFT JOIN tasks t ON t.id = dl.task_id
      LEFT JOIN users rv ON rv.id = dl.reviewed_by
      WHERE dl.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (role === 'employee') {
      sql += ` AND dl.user_id = $${idx++}`;
      params.push(userId);
    } else if (logUserId) {
      sql += ` AND dl.user_id = $${idx++}`;
      params.push(logUserId);
    }

    if (date) { sql += ` AND dl.log_date = $${idx++}`; params.push(date); }
    if (projectId) { sql += ` AND dl.project_id = $${idx++}`; params.push(projectId); }
    if (logState === 'submitted') { sql += ` AND dl.is_submitted = true`; }
    if (logState === 'missing') {
      sql += ` AND dl.log_date < CURRENT_DATE AND dl.is_submitted = false`;
    }
    if (search) {
      sql += ` AND dl.work_done ILIKE $${idx++}`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY dl.log_date DESC, dl.created_at DESC`;

    return this.db.paginate(sql, params, Number(page), Number(limit));
  }

  async findById(tenantId: string, logId: string) {
    const log = await this.db.queryOne(
      `SELECT dl.*, u.first_name || ' ' || u.last_name AS user_name, u.avatar_url,
              p.name AS project_name, t.title AS task_title
       FROM daily_logs dl
       JOIN users u ON u.id = dl.user_id
       LEFT JOIN projects p ON p.id = dl.project_id
       LEFT JOIN tasks t ON t.id = dl.task_id
       WHERE dl.id = $1 AND dl.tenant_id = $2`,
      [logId, tenantId],
    );
    if (!log) throw new NotFoundException('Daily log not found');
    return log;
  }

  async createOrUpdate(tenantId: string, userId: string, dto: any) {
    const {
      projectId, taskId, logDate, status, workDone, hoursSpent,
      progressPct, blockers, tomorrowsPlan, moodScore,
    } = dto;

    const date = logDate || new Date().toISOString().split('T')[0];

    const existing = await this.db.queryOne(
      `SELECT id FROM daily_logs
       WHERE user_id = $1 AND project_id = $2 AND log_date = $3 AND tenant_id = $4`,
      [userId, projectId || null, date, tenantId],
    );

    if (existing) {
      return this.db.queryOne(
        `UPDATE daily_logs SET
           task_id = $1, status = $2, work_done = $3, hours_spent = $4,
           progress_pct = $5, blockers = $6, tomorrows_plan = $7, mood_score = $8
         WHERE id = $9 RETURNING *`,
        [taskId || null, status, workDone, hoursSpent, progressPct,
         blockers, tomorrowsPlan, moodScore, existing.id],
      );
    }

    return this.db.queryOne(
      `INSERT INTO daily_logs
         (tenant_id, user_id, project_id, task_id, log_date, status,
          work_done, hours_spent, progress_pct, blockers, tomorrows_plan, mood_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [tenantId, userId, projectId || null, taskId || null, date, status || 'in_progress',
       workDone, hoursSpent || 0, progressPct, blockers, tomorrowsPlan, moodScore],
    );
  }

  async submit(tenantId: string, logId: string, userId: string) {
    const log = await this.db.queryOne(
      'SELECT * FROM daily_logs WHERE id = $1 AND user_id = $2 AND tenant_id = $3',
      [logId, userId, tenantId],
    );
    if (!log) throw new NotFoundException('Daily log not found');

    if (log.is_submitted) return log;

    const submitted = await this.db.queryOne(
      `UPDATE daily_logs SET is_submitted = true, submitted_at = NOW()
       WHERE id = $1 RETURNING *`,
      [logId],
    );

    // Update task progress if linked
    if (log.task_id && log.progress_pct !== null) {
      await this.db.query(
        'UPDATE tasks SET progress_pct = $1 WHERE id = $2',
        [log.progress_pct, log.task_id],
      );
    }

    return submitted;
  }

  async getTeamFeed(tenantId: string, query: any = {}) {
    const { date = new Date().toISOString().split('T')[0], projectId, page = 1, limit = 30 } = query;

    let sql = `
      SELECT
        dl.id, dl.log_date, dl.status, dl.work_done, dl.hours_spent,
        dl.progress_pct, dl.blockers, dl.is_submitted, dl.submitted_at,
        u.id AS user_id, u.first_name || ' ' || u.last_name AS user_name,
        u.avatar_url, u.department, u.designation,
        p.name AS project_name, p.color AS project_color,
        t.title AS task_title, t.status AS task_status
      FROM daily_logs dl
      JOIN users u ON u.id = dl.user_id
      LEFT JOIN projects p ON p.id = dl.project_id
      LEFT JOIN tasks t ON t.id = dl.task_id
      WHERE dl.tenant_id = $1 AND dl.log_date = $2 AND dl.is_submitted = true
    `;
    const params: any[] = [tenantId, date];
    let idx = 3;

    if (projectId) { sql += ` AND dl.project_id = $${idx++}`; params.push(projectId); }
    sql += ` ORDER BY dl.submitted_at DESC`;

    return this.db.paginate(sql, params, Number(page), Number(limit));
  }

  async getMissingLogs(tenantId: string, date?: string) {
    const checkDate = date || new Date().toISOString().split('T')[0];

    return this.db.queryMany(
      `SELECT
         u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.department,
         ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) AS projects
       FROM users u
       JOIN project_members pm ON pm.user_id = u.id AND pm.left_at IS NULL
       JOIN projects p ON p.id = pm.project_id AND p.status = 'active'
       WHERE u.tenant_id = $1
         AND u.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM daily_logs dl
           WHERE dl.user_id = u.id AND dl.log_date = $2 AND dl.is_submitted = true
         )
       GROUP BY u.id`,
      [tenantId, checkDate],
    );
  }

  async getContributionHeatmap(tenantId: string, userId: string, weeks: number = 26) {
    return this.db.queryMany(
      `SELECT
         DATE_TRUNC('day', log_date) AS date,
         SUM(hours_spent) AS hours,
         COUNT(*) AS log_count
       FROM daily_logs
       WHERE tenant_id = $1 AND user_id = $2
         AND log_date >= CURRENT_DATE - ($3 * 7 || ' days')::INTERVAL
         AND is_submitted = true
       GROUP BY DATE_TRUNC('day', log_date)
       ORDER BY date`,
      [tenantId, userId, weeks],
    );
  }

  @Cron('0 17 * * 1-5') // 5 PM on weekdays
  async sendDailyLogReminders() {
    this.logger.log('Running daily log reminder job...');
    // In production: query users without logs and send notifications
  }
}
