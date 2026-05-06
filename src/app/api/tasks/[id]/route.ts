import { NextRequest, NextResponse } from 'next/server';
import pool, { query, toCamel } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

const TASK_SELECT = `
  SELECT
    t.id, t.project_id, t.milestone_id, t.sprint_id,
    t.title, t.description, t.assignee_id, t.reporter_id,
    t.status, t.priority, t.start_date, t.due_date,
    t.estimated_hours, t.actual_hours, t.progress_percent, t.position,
    t.created_at, t.updated_at,
    a.id AS a_id, a.name AS a_name, a.email AS a_email, a.image AS a_image, a.designation AS a_designation,
    r.id AS r_id, r.name AS r_name, r.email AS r_email, r.image AS r_image,
    p.id AS p_id, p.name AS p_name, p.status AS p_status
  FROM tasks t
  JOIN users a    ON a.id = t.assignee_id
  JOIN users r    ON r.id = t.reporter_id
  JOIN projects p ON p.id = t.project_id
`;

async function buildTask(id: string) {
  const rows = await query(`${TASK_SELECT} WHERE t.id = $1`, [id]);
  if (!rows[0]) return null;

  const [subtasks, tags, comments] = await Promise.all([
    query(`SELECT * FROM subtasks WHERE task_id = $1 ORDER BY position ASC`, [id]),
    query(`SELECT * FROM task_tags WHERE task_id = $1`, [id]),
    query(
      `SELECT c.id, c.content, c.created_at, c.updated_at, c.parent_id, c.is_edited,
              u.id AS u_id, u.name AS u_name, u.image AS u_image
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.task_id = $1 ORDER BY c.created_at ASC`,
      [id],
    ),
  ]);

  const {
    aId, aName, aEmail, aImage, aDesignation,
    rId, rName, rEmail, rImage,
    pId, pName, pStatus,
    ...task
  } = toCamel(rows[0]);

  return {
    ...task,
    assignee: { id: aId, name: aName, email: aEmail, image: aImage, designation: aDesignation },
    reporter: { id: rId, name: rName, email: rEmail, image: rImage },
    project:  { id: pId, name: pName, status: pStatus },
    subtasks: subtasks.map(toCamel),
    tags:     tags.map(toCamel),
    comments: comments.map(c => ({
      id: c.id, content: c.content, createdAt: c.created_at, updatedAt: c.updated_at,
      parentId: c.parent_id, isEdited: c.is_edited,
      author: { id: c.u_id, name: c.u_name, image: c.u_image },
    })),
  };
}

// ── GET /api/tasks/:id ────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const task = await buildTask(id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

// ── PATCH /api/tasks/:id ──────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const { rows: existing } = await pool.query(
    `SELECT status, project_id, reporter_id FROM tasks WHERE id = $1`,
    [id],
  );
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();

  // Subtask toggle shortcut
  if (body.subtaskId !== undefined && body.completed !== undefined) {
    await pool.query(
      `UPDATE subtasks SET completed = $1, completed_at = $2 WHERE id = $3`,
      [body.completed, body.completed ? new Date() : null, body.subtaskId],
    );
    return NextResponse.json({ ok: true });
  }

  const oldStatus = existing[0].status;
  const sets: string[] = [];
  const vals: any[]    = [];
  let i = 1;

  const add = (col: string, val: any) => { sets.push(`${col} = $${i++}`); vals.push(val); };

  if (body.title           !== undefined) add('title',            body.title);
  if (body.description     !== undefined) add('description',      body.description);
  if (body.status          !== undefined) add('status',           body.status);
  if (body.priority        !== undefined) add('priority',         body.priority);
  if (body.progressPercent !== undefined) add('progress_percent', parseInt(body.progressPercent));
  if (body.assigneeId      !== undefined) add('assignee_id',      body.assigneeId);
  if (body.dueDate         !== undefined) add('due_date',         new Date(body.dueDate));
  if (body.estimatedHours  !== undefined) add('estimated_hours',  parseFloat(body.estimatedHours));
  if (body.actualHours     !== undefined) add('actual_hours',     parseFloat(body.actualHours));

  if (sets.length > 0) {
    vals.push(id);
    await pool.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  }

  // Audit on status change
  if (body.status && body.status !== oldStatus) {
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, task_id, project_id, action, entity_type, entity_id, old_value, new_value)
       VALUES ($1,$2,$3,$4,'task.status.changed','Task',$3,$5,$6)`,
      [
        crypto.randomUUID(), session!.user.id, id, existing[0].project_id,
        JSON.stringify({ status: oldStatus }),
        JSON.stringify({ status: body.status }),
      ],
    );
  }

  const task = await buildTask(id);
  return NextResponse.json(task);
}

// ── DELETE /api/tasks/:id ─────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const { rows } = await pool.query(`SELECT reporter_id FROM tasks WHERE id = $1`, [id]);
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canDelete =
    rows[0].reporter_id === session!.user.id ||
    ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'].includes(session!.user.role);
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);
  return new NextResponse(null, { status: 204 });
}
