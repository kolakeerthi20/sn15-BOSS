import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(tenantId: string, userId: string, role: string, query: any = {}) {
    const {
      page = 1, limit = 50, projectId, sprintId, assigneeId,
      status, priority, parentTaskId, search, myTasks, overdue,
    } = query;

    let sql = `
      SELECT
        t.id, t.title, t.description, t.status, t.priority,
        t.start_date, t.due_date, t.completed_at,
        t.estimated_hours, t.logged_hours, t.progress_pct,
        t.story_points, t.labels, t.position,
        t.project_id, t.sprint_id, t.milestone_id, t.parent_task_id,
        t.created_at, t.updated_at,
        p.name AS project_name, p.color AS project_color,
        a.id AS assignee_id, a.first_name || ' ' || a.last_name AS assignee_name,
        a.avatar_url AS assignee_avatar,
        r.first_name || ' ' || r.last_name AS reporter_name,
        COUNT(DISTINCT sub.id) AS subtask_count,
        COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'completed') AS subtask_completed,
        COUNT(DISTINCT c.id) AS comment_count,
        COUNT(DISTINCT f.id) AS attachment_count
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users a ON a.id = t.assignee_id
      LEFT JOIN users r ON r.id = t.reporter_id
      LEFT JOIN tasks sub ON sub.parent_task_id = t.id
      LEFT JOIN comments c ON c.entity_type = 'task' AND c.entity_id = t.id AND c.is_deleted = false
      LEFT JOIN files f ON f.entity_type = 'task' AND f.entity_id = t.id AND f.is_deleted = false
      WHERE t.tenant_id = $1 AND t.parent_task_id IS NULL
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (projectId) { sql += ` AND t.project_id = $${idx++}`; params.push(projectId); }
    if (sprintId) { sql += ` AND t.sprint_id = $${idx++}`; params.push(sprintId); }
    if (assigneeId) { sql += ` AND t.assignee_id = $${idx++}`; params.push(assigneeId); }
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      sql += ` AND t.status = ANY($${idx++}::text[])`;
      params.push(statuses);
    }
    if (priority) { sql += ` AND t.priority = $${idx++}`; params.push(priority); }
    if (myTasks === 'true') { sql += ` AND t.assignee_id = $${idx++}`; params.push(userId); }
    if (overdue === 'true') {
      sql += ` AND t.due_date < CURRENT_DATE AND t.status NOT IN ('completed','cancelled')`;
    }
    if (search) {
      sql += ` AND t.title ILIKE $${idx++}`;
      params.push(`%${search}%`);
    }

    sql += ` GROUP BY t.id, p.name, p.color, a.id, a.first_name, a.last_name, a.avatar_url, r.first_name, r.last_name`;
    sql += ` ORDER BY t.position, t.priority DESC, t.due_date NULLS LAST`;

    return this.db.paginate(sql, params, Number(page), Number(limit));
  }

  async findById(tenantId: string, taskId: string) {
    const task = await this.db.queryOne(
      `SELECT t.*,
              p.name AS project_name, p.color AS project_color,
              a.first_name || ' ' || a.last_name AS assignee_name, a.avatar_url AS assignee_avatar,
              r.first_name || ' ' || r.last_name AS reporter_name,
              s.name AS sprint_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users a ON a.id = t.assignee_id
       LEFT JOIN users r ON r.id = t.reporter_id
       LEFT JOIN sprints s ON s.id = t.sprint_id
       WHERE t.id = $1 AND t.tenant_id = $2`,
      [taskId, tenantId],
    );
    if (!task) throw new NotFoundException('Task not found');

    const [subtasks, comments, attachments, timeEntries, watchers, dependencies] = await Promise.all([
      this.db.queryMany(
        `SELECT t.*, a.first_name || ' ' || a.last_name AS assignee_name, a.avatar_url AS assignee_avatar
         FROM tasks t LEFT JOIN users a ON a.id = t.assignee_id
         WHERE t.parent_task_id = $1 ORDER BY t.position`,
        [taskId],
      ),
      this.db.queryMany(
        `SELECT c.*, u.first_name || ' ' || u.last_name AS author_name, u.avatar_url AS author_avatar
         FROM comments c JOIN users u ON u.id = c.author_id
         WHERE c.entity_type = 'task' AND c.entity_id = $1 AND c.is_deleted = false
         ORDER BY c.created_at`,
        [taskId],
      ),
      this.db.queryMany(
        `SELECT f.*, u.first_name || ' ' || u.last_name AS uploader_name
         FROM files f JOIN users u ON u.id = f.uploaded_by
         WHERE f.entity_type = 'task' AND f.entity_id = $1 AND f.is_deleted = false`,
        [taskId],
      ),
      this.db.queryMany(
        `SELECT tte.*, u.first_name || ' ' || u.last_name AS user_name
         FROM task_time_entries tte JOIN users u ON u.id = tte.user_id
         WHERE tte.task_id = $1 ORDER BY tte.date DESC`,
        [taskId],
      ),
      this.db.queryMany(
        `SELECT u.id, u.first_name, u.last_name, u.avatar_url
         FROM task_watchers tw JOIN users u ON u.id = tw.user_id
         WHERE tw.task_id = $1`,
        [taskId],
      ),
      this.db.queryMany(
        `SELECT td.*, t.title AS depends_on_title, t.status AS depends_on_status
         FROM task_dependencies td JOIN tasks t ON t.id = td.depends_on_id
         WHERE td.task_id = $1`,
        [taskId],
      ),
    ]);

    return { ...task, subtasks, comments, attachments, timeEntries, watchers, dependencies };
  }

  async create(tenantId: string, userId: string, dto: CreateTaskDto) {
    const task = await this.db.queryOne(
      `INSERT INTO tasks
         (tenant_id, project_id, sprint_id, milestone_id, parent_task_id,
          title, description, status, priority, assignee_id, reporter_id,
          start_date, due_date, estimated_hours, story_points, labels, position, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
               COALESCE($17, (SELECT COALESCE(MAX(position),0)+1 FROM tasks WHERE project_id = $2 AND parent_task_id IS NULL)),
               $11)
       RETURNING *`,
      [
        tenantId, dto.projectId, dto.sprintId || null, dto.milestoneId || null,
        dto.parentTaskId || null, dto.title, dto.description, dto.status || 'not_started',
        dto.priority || 'medium', dto.assigneeId || null, userId,
        dto.startDate || null, dto.dueDate || null,
        dto.estimatedHours || null, dto.storyPoints || null,
        dto.labels || [], dto.position || null,
      ],
    );

    await this.db.query(
      `INSERT INTO activity_logs (tenant_id, actor_id, entity_type, entity_id, action, new_values)
       VALUES ($1, $2, 'task', $3, 'created', $4)`,
      [tenantId, userId, task.id, JSON.stringify({ title: task.title, projectId: task.project_id })],
    );

    return task;
  }

  async update(tenantId: string, taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.db.queryOne(
      'SELECT * FROM tasks WHERE id = $1 AND tenant_id = $2',
      [taskId, tenantId],
    );
    if (!task) throw new NotFoundException('Task not found');

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      title: 'title', description: 'description', status: 'status',
      priority: 'priority', assigneeId: 'assignee_id', startDate: 'start_date',
      dueDate: 'due_date', estimatedHours: 'estimated_hours', progressPct: 'progress_pct',
      storyPoints: 'story_points', labels: 'labels', sprintId: 'sprint_id',
      milestoneId: 'milestone_id', position: 'position',
    };

    for (const [dtoKey, dbCol] of Object.entries(fieldMap)) {
      if ((dto as any)[dtoKey] !== undefined) {
        fields.push(`${dbCol} = $${idx++}`);
        params.push((dto as any)[dtoKey]);
      }
    }

    if (dto.status === 'completed' && task.status !== 'completed') {
      fields.push(`completed_at = $${idx++}`);
      params.push(new Date());
      fields.push(`progress_pct = 100`);
    }

    if (!fields.length) return task;

    params.push(taskId, tenantId);
    const updated = await this.db.queryOne(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
      params,
    );

    await this.db.query(
      `INSERT INTO activity_logs (tenant_id, actor_id, entity_type, entity_id, action, old_values, new_values)
       VALUES ($1, $2, 'task', $3, 'updated', $4, $5)`,
      [tenantId, userId, taskId, JSON.stringify({ status: task.status }), JSON.stringify(dto)],
    );

    return updated;
  }

  async logTime(taskId: string, userId: string, tenantId: string, dto: { hours: number; description?: string; date?: string; isBillable?: boolean }) {
    const entry = await this.db.queryOne(
      `INSERT INTO task_time_entries (task_id, user_id, hours, description, date, is_billable)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [taskId, userId, dto.hours, dto.description, dto.date || new Date().toISOString().split('T')[0], dto.isBillable ?? true],
    );

    await this.db.query(
      `UPDATE tasks SET logged_hours = logged_hours + $1 WHERE id = $2`,
      [dto.hours, taskId],
    );

    return entry;
  }

  async addComment(taskId: string, userId: string, tenantId: string, dto: { content?: string; videoUrl?: string; imageUrls?: string[]; updateType?: string; progressPct?: number }) {
    // Store as JSON if rich content, otherwise plain text
    const hasMedia = dto.videoUrl || (dto.imageUrls && dto.imageUrls.length > 0) || dto.updateType !== 'comment';
    const content = hasMedia
      ? JSON.stringify({
          text: dto.content || '',
          videoUrl: dto.videoUrl,
          imageUrls: dto.imageUrls || [],
          updateType: dto.updateType || 'comment',
          progressPct: dto.progressPct,
        })
      : (dto.content || '');

    const comment = await this.db.queryOne(
      `INSERT INTO comments (tenant_id, entity_type, entity_id, author_id, content)
       VALUES ($1, 'task', $2, $3, $4)
       RETURNING *`,
      [tenantId, taskId, userId, content],
    );

    // Update task progress if provided
    if (dto.progressPct !== undefined) {
      await this.db.query(
        `UPDATE tasks SET progress_pct = $1, updated_at = NOW() WHERE id = $2`,
        [dto.progressPct, taskId],
      );
    }

    // Fetch author info
    const author = await this.db.queryOne(
      `SELECT first_name || ' ' || last_name AS author_name, avatar_url AS author_avatar FROM users WHERE id = $1`,
      [userId],
    );

    return { ...comment, ...author };
  }

  async delete(tenantId: string, taskId: string) {
    await this.db.query(
      `UPDATE tasks SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2`,
      [taskId, tenantId],
    );
  }
}
