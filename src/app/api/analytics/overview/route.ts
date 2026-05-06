import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(session!.user.role);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const sevenDaysLater = new Date(now.getTime() + 7 * 86_400_000);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  // Parameterized project scope — avoids SQL injection
  const scopeParams: any[] = [];
  const projectScope = isManager
    ? `SELECT id FROM projects WHERE is_archived = false`
    : (() => {
        scopeParams.push(session!.user.id);
        return `SELECT id FROM projects WHERE is_archived = false
                AND id IN (SELECT project_id FROM project_members WHERE user_id = $1)`;
      })();

  const [
    totals, users, tasks, todayLogs, upcoming,
  ] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE true)                         AS total_projects,
         COUNT(*) FILTER (WHERE status = 'ACTIVE')            AS active_projects,
         COUNT(*) FILTER (WHERE status = 'AT_RISK')           AS at_risk_projects
       FROM projects WHERE id IN (${projectScope})`,
      scopeParams,
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_active = true)             AS total_users,
         COUNT(*) FILTER (WHERE is_active = true AND last_login_at >= $1) AS active_users
       FROM users`,
      [sevenDaysAgo],
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status != 'COMPLETED' AND due_date < $${scopeParams.length + 1}) AS overdue,
         COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')                  AS in_progress,
         COUNT(*) FILTER (WHERE status = 'BLOCKED')                      AS blocked
       FROM tasks WHERE project_id IN (${projectScope})`,
      [...scopeParams, now],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM daily_logs WHERE date >= $1`,
      [todayStart],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM tasks
       WHERE project_id IN (${projectScope})
         AND status != 'COMPLETED'
         AND due_date >= $${scopeParams.length + 1} AND due_date <= $${scopeParams.length + 2}`,
      [...scopeParams, now, sevenDaysLater],
    ),
  ]);

  const t = totals.rows[0];
  const u = users.rows[0];
  const k = tasks.rows[0];

  return NextResponse.json({
    totalProjects:      parseInt(t.total_projects),
    activeProjects:     parseInt(t.active_projects),
    delayedProjects:    parseInt(t.at_risk_projects),
    totalResources:     parseInt(u.total_users),
    activeResources:    parseInt(u.active_users),
    avgUtilization:     0,
    tasksCompletedToday: todayLogs.rows[0].count,
    upcomingDeadlines:  upcoming.rows[0].count,
    overdueTasks:       parseInt(k.overdue),
    inProgressTasks:    parseInt(k.in_progress),
    blockedTasks:       parseInt(k.blocked),
    productivityScore:  0,
    burnRate:           0,
  });
}
