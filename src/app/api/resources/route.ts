import { NextRequest, NextResponse } from 'next/server';
import { query, toCamel } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search     = searchParams.get('search');
  const department = searchParams.get('department');

  const conditions: string[] = ['u.is_active = true'];
  const params: any[] = [];
  let i = 1;

  if (search) {
    conditions.push(
      `(u.name ILIKE $${i} OR u.email ILIKE $${i} OR u.designation ILIKE $${i})`,
    );
    params.push(`%${search}%`);
    i++;
  }
  if (department && department !== 'ALL') {
    conditions.push(`u.department = $${i++}`);
    params.push(department);
  }

  const where = conditions.join(' AND ');

  const users = await query(
    `SELECT
       u.id, u.name, u.email, u.image, u.role, u.department, u.designation,
       u.billable_rate::float, u.is_active, u.last_login_at, u.created_at,
       -- utilization: active tasks * 25, capped at 100
       LEAST(
         (SELECT COUNT(*)::int FROM tasks t
          WHERE t.assignee_id = u.id AND t.status != 'COMPLETED'
            AND t.project_id IN (SELECT id FROM projects WHERE is_archived = false)
         ) * 25,
         100
       ) AS utilization,
       -- active task count
       (SELECT COUNT(*)::int FROM tasks t
        WHERE t.assignee_id = u.id AND t.status != 'COMPLETED') AS active_task_count,
       -- daily log count
       (SELECT COUNT(*)::int FROM daily_logs dl WHERE dl.user_id = u.id) AS daily_log_count
     FROM users u
     WHERE ${where}
     ORDER BY u.name ASC`,
    params,
  );

  const userIds = users.map(u => u.id);
  if (userIds.length === 0) return NextResponse.json([]);

  const [skills, projectMembers, activeTasks] = await Promise.all([
    query(
      `SELECT us.user_id, us.id, us.skill, us.level FROM user_skills us WHERE us.user_id = ANY($1)`,
      [userIds],
    ),
    query(
      `SELECT pm.user_id, pm.id, pm.project_id, pm.role, pm.allocation,
              p.id AS p_id, p.name AS p_name, p.status AS p_status
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.user_id = ANY($1)
         AND p.is_archived = false
         AND p.status IN ('ACTIVE','AT_RISK','PLANNING')`,
      [userIds],
    ),
    query(
      `SELECT t.id, t.assignee_id, t.title, t.status, t.priority, t.due_date
       FROM tasks t
       WHERE t.assignee_id = ANY($1) AND t.status != 'COMPLETED'
         AND t.project_id IN (SELECT id FROM projects WHERE is_archived = false)
       ORDER BY t.due_date ASC NULLS LAST`,
      [userIds],
    ),
  ]);

  const result = users.map(u => {
    const base = toCamel(u);
    return {
      ...base,
      userSkills: skills
        .filter(s => s.user_id === u.id)
        .map(s => ({ id: s.id, skill: s.skill, level: s.level })),
      projectMembers: projectMembers
        .filter(pm => pm.user_id === u.id)
        .map(pm => ({
          id: pm.id, projectId: pm.project_id, userId: pm.user_id,
          role: pm.role, allocation: pm.allocation,
          project: { id: pm.p_id, name: pm.p_name, status: pm.p_status },
        })),
      assignedTasks: activeTasks
        .filter(t => t.assignee_id === u.id)
        .map(t => ({
          id: t.id, title: t.title, status: t.status,
          priority: t.priority, dueDate: t.due_date,
        })),
      _count: {
        assignedTasks: u.active_task_count,
        dailyLogs:     u.daily_log_count,
      },
    };
  });

  return NextResponse.json(result);
}
