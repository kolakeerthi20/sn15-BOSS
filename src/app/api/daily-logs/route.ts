import { NextRequest, NextResponse } from 'next/server';
import pool, { query, toCamel } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

async function buildLogs(rows: any[]) {
  if (rows.length === 0) return [];
  const logIds = rows.map(r => r.id);
  const deliverables = await query(
    `SELECT * FROM log_deliverables WHERE log_id = ANY($1)`,
    [logIds],
  );
  return rows.map(row => {
    const {
      uId, uName, uEmail, uImage, uDesignation, uDepartment,
      pId, pName,
      tId, tTitle,
      ...log
    } = toCamel(row);
    return {
      ...log,
      user:         { id: uId, name: uName, email: uEmail, image: uImage, designation: uDesignation, department: uDepartment },
      project:      { id: pId, name: pName },
      task:         tId ? { id: tId, title: tTitle } : null,
      deliverables: deliverables.filter(d => d.log_id === log.id).map(toCamel),
    };
  });
}

const LOG_SELECT = `
  SELECT
    dl.id, dl.user_id, dl.project_id, dl.task_id, dl.date,
    dl.status, dl.summary, dl.hours_worked::float, dl.blockers,
    dl.tomorrow_plan, dl.progress_percent, dl.created_at, dl.updated_at,
    u.id AS u_id, u.name AS u_name, u.email AS u_email, u.image AS u_image,
    u.designation AS u_designation, u.department AS u_department,
    p.id AS p_id, p.name AS p_name,
    t.id AS t_id, t.title AS t_title
  FROM daily_logs dl
  JOIN users u    ON u.id = dl.user_id
  JOIN projects p ON p.id = dl.project_id
  LEFT JOIN tasks t ON t.id = dl.task_id
`;

// ── GET /api/daily-logs ───────────────────────────────────────

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const date      = searchParams.get('date');
  const projectId = searchParams.get('projectId');
  const userId    = searchParams.get('userId');
  const teamFeed  = searchParams.get('teamFeed') === 'true';

  const conditions: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (date) {
    const d = new Date(date);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    conditions.push(`dl.date >= $${i++} AND dl.date < $${i++}`);
    params.push(d, next);
  }
  if (projectId) {
    conditions.push(`dl.project_id = $${i++}`);
    params.push(projectId);
  }
  if (userId) {
    conditions.push(`dl.user_id = $${i++}`);
    params.push(userId);
  } else if (!teamFeed) {
    conditions.push(`dl.user_id = $${i++}`);
    params.push(session!.user.id);
  }

  if (teamFeed && session!.user.role === 'EMPLOYEE') {
    conditions.push(
      `dl.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${i++})`,
    );
    params.push(session!.user.id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `${LOG_SELECT} ${where} ORDER BY dl.created_at DESC LIMIT 50`,
    params,
  );

  return NextResponse.json(await buildLogs(rows));
}

// ── POST /api/daily-logs ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const {
    projectId, taskId, status, summary, hoursWorked,
    blockers, tomorrowPlan, progressPercent, deliverables,
  } = body;

  if (!projectId || !summary) {
    return NextResponse.json({ error: 'projectId and summary are required' }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = crypto.randomUUID();

    await client.query(
      `INSERT INTO daily_logs
         (id, user_id, project_id, task_id, date, status, summary,
          hours_worked, blockers, tomorrow_plan, progress_percent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id, session!.user.id, projectId, taskId || null,
        today, status ?? 'IN_PROGRESS', summary,
        parseFloat(hoursWorked) || 0,
        blockers || null, tomorrowPlan || null,
        parseInt(progressPercent) || 0,
      ],
    );

    const validDeliverables = (deliverables ?? []).filter(Boolean);
    for (const title of validDeliverables as string[]) {
      await client.query(
        `INSERT INTO log_deliverables (id, log_id, title) VALUES ($1,$2,$3)`,
        [crypto.randomUUID(), id, title],
      );
    }

    // Increment task actual hours if linked
    if (taskId && hoursWorked) {
      await client.query(
        `UPDATE tasks SET actual_hours = actual_hours + $1 WHERE id = $2`,
        [parseFloat(hoursWorked), taskId],
      );
    }

    await client.query('COMMIT');

    const rows = await query(`${LOG_SELECT} WHERE dl.id = $1`, [id]);
    return NextResponse.json((await buildLogs(rows))[0], { status: 201 });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
