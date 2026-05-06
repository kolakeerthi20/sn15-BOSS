import { NextRequest, NextResponse } from 'next/server';
import pool, { query, toCamel } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [skills, projectMembers, tasks, logs] = await Promise.all([
    query(`SELECT * FROM user_skills WHERE user_id = $1`, [id]),
    query(
      `SELECT pm.*, p.id AS p_id, p.name AS p_name, p.status AS p_status
       FROM project_members pm JOIN projects p ON p.id = pm.project_id
       WHERE pm.user_id = $1`,
      [id],
    ),
    query(
      `SELECT t.*, p.id AS p_id, p.name AS p_name
       FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE t.assignee_id = $1
       ORDER BY t.due_date ASC NULLS LAST`,
      [id],
    ),
    query(
      `SELECT dl.*, p.id AS p_id, p.name AS p_name
       FROM daily_logs dl JOIN projects p ON p.id = dl.project_id
       WHERE dl.user_id = $1
       ORDER BY dl.date DESC
       LIMIT 10`,
      [id],
    ),
  ]);

  return NextResponse.json({
    ...toCamel(rows[0]),
    userSkills: skills.map(toCamel),
    projectMembers: projectMembers.map(pm => ({
      ...toCamel(pm),
      project: { id: pm.p_id, name: pm.p_name, status: pm.p_status },
    })),
    assignedTasks: tasks.map(t => ({
      ...toCamel(t),
      project: { id: t.p_id, name: t.p_name },
    })),
    dailyLogs: logs.map(l => ({
      ...toCamel(l),
      project: { id: l.p_id, name: l.p_name },
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const body = await req.json();
  const { role, department, designation, billableRate, isActive } = body;

  if (role && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can change user roles' }, { status: 403 });
  }

  const isSelf  = session!.user.id === id;
  const canEdit = isSelf || ['ADMIN', 'PROJECT_MANAGER'].includes(session!.user.role);
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const sets: string[] = [];
  const vals: any[]    = [];
  let i = 1;

  const add = (col: string, val: any) => { sets.push(`${col} = $${i++}`); vals.push(val); };

  if (role        !== undefined) add('role',          role);
  if (department  !== undefined) add('department',    department);
  if (designation !== undefined) add('designation',   designation);
  if (billableRate !== undefined) add('billable_rate', billableRate ? parseFloat(billableRate) : null);
  if (isActive    !== undefined) add('is_active',     isActive);

  if (sets.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, name, email, role, department, designation`,
    vals,
  );

  return NextResponse.json(toCamel(rows[0]));
}
