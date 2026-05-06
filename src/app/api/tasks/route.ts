import { NextRequest, NextResponse } from 'next/server';
import pool, { query, toCamel } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

// ── Shared: build task objects from rows + subtasks/tags ──────

async function loadTaskRelations(taskIds: string[]) {
  if (taskIds.length === 0) return { subtasks: [], tags: [] };
  const [subtasks, tags] = await Promise.all([
    query(`SELECT * FROM subtasks WHERE task_id = ANY($1) ORDER BY position ASC`, [taskIds]),
    query(`SELECT * FROM task_tags WHERE task_id = ANY($1)`, [taskIds]),
  ]);
  return { subtasks, tags };
}

function buildTasks(rows: any[], subtasks: any[], tags: any[]) {
  return rows.map(row => {
    const {
      aId, aName, aEmail, aImage, aDesignation,
      rId, rName, rEmail, rImage,
      pId, pName, pStatus,
      ...task
    } = toCamel(row);

    return {
      ...task,
      assignee: { id: aId, name: aName, email: aEmail, image: aImage, designation: aDesignation },
      reporter: { id: rId, name: rName, email: rEmail, image: rImage },
      project:  { id: pId, name: pName, status: pStatus },
      subtasks: subtasks.filter(s => s.task_id === task.id).map(toCamel),
      tags:     tags.filter(t => t.task_id === task.id).map(toCamel),
    };
  });
}

const TASK_SELECT = `
  SELECT
    t.id, t.project_id, t.milestone_id, t.sprint_id,
    t.title, t.description, t.assignee_id, t.reporter_id,
    t.status, t.priority, t.start_date, t.due_date,
    t.estimated_hours::float, t.actual_hours::float, t.progress_percent, t.position,
    t.created_at, t.updated_at,
    a.id   AS a_id,   a.name  AS a_name,  a.email AS a_email, a.image AS a_image, a.designation AS a_designation,
    r.id   AS r_id,   r.name  AS r_name,  r.email AS r_email, r.image AS r_image,
    p.id   AS p_id,   p.name  AS p_name,  p.status AS p_status
  FROM tasks t
  JOIN users a    ON a.id = t.assignee_id
  JOIN users r    ON r.id = t.reporter_id
  JOIN projects p ON p.id = t.project_id
`;

// ── GET /api/tasks ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const projectId  = searchParams.get('projectId');
  const status     = searchParams.get('status');
  const assigneeId = searchParams.get('assigneeId');
  const myTasks    = searchParams.get('myTasks') === 'true';

  const conditions: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (projectId)                    { conditions.push(`t.project_id = $${i++}`);   params.push(projectId); }
  if (status && status !== 'ALL')   { conditions.push(`t.status = $${i++}`);        params.push(status); }
  if (assigneeId)                   { conditions.push(`t.assignee_id = $${i++}`);  params.push(assigneeId); }
  if (myTasks)                      { conditions.push(`t.assignee_id = $${i++}`);  params.push(session!.user.id); }

  if (session!.user.role === 'EMPLOYEE') {
    conditions.push(
      `t.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${i++})`,
    );
    params.push(session!.user.id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `${TASK_SELECT} ${where} ORDER BY t.position ASC, t.created_at DESC`,
    params,
  );

  const { subtasks, tags } = await loadTaskRelations(rows.map(r => r.id));
  return NextResponse.json(buildTasks(rows, subtasks, tags));
}

// ── POST /api/tasks ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { projectId, title, assigneeId, description, priority, startDate, dueDate,
          estimatedHours, tags, subtasks, milestoneId, sprintId } = body;

  if (!projectId || !title || !assigneeId) {
    return NextResponse.json({ error: 'projectId, title, assigneeId are required' }, { status: 400 });
  }

  const { rows: proj } = await pool.query(`SELECT id, name FROM projects WHERE id = $1`, [projectId]);
  if (!proj[0]) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = crypto.randomUUID();

    await client.query(
      `INSERT INTO tasks
         (id, project_id, milestone_id, sprint_id, title, description,
          assignee_id, reporter_id, priority, status,
          start_date, due_date, estimated_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'NOT_STARTED',$10,$11,$12)`,
      [
        id, projectId, milestoneId ?? null, sprintId ?? null,
        title, description ?? null,
        assigneeId, session!.user.id,
        priority ?? 'MEDIUM',
        startDate ? new Date(startDate) : null,
        dueDate   ? new Date(dueDate)   : null,
        estimatedHours ? parseFloat(estimatedHours) : 0,
      ],
    );

    if (tags?.length) {
      for (const tag of tags as string[]) {
        await client.query(
          `INSERT INTO task_tags (id, task_id, tag) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [crypto.randomUUID(), id, tag],
        );
      }
    }

    if (subtasks?.length) {
      for (let pos = 0; pos < subtasks.length; pos++) {
        await client.query(
          `INSERT INTO subtasks (id, task_id, title, position) VALUES ($1,$2,$3,$4)`,
          [crypto.randomUUID(), id, subtasks[pos], pos],
        );
      }
    }

    // Notify assignee
    if (assigneeId !== session!.user.id) {
      await client.query(
        `INSERT INTO notifications (id, user_id, type, title, message, link)
         VALUES ($1,$2,'TASK_ASSIGNED',$3,$4,'/tasks')`,
        [
          crypto.randomUUID(), assigneeId,
          'New task assigned to you',
          `"${title}" has been assigned to you in ${proj[0].name}`,
        ],
      );
    }

    await client.query('COMMIT');

    const rows = await query(`${TASK_SELECT} WHERE t.id = $1`, [id]);
    const { subtasks: st, tags: tg } = await loadTaskRelations([id]);
    return NextResponse.json(buildTasks(rows, st, tg)[0], { status: 201 });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
