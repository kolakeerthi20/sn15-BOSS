import { NextRequest, NextResponse } from 'next/server';
import pool, { query, toCamel } from '@/lib/db';
import { requireAuth, requireRole, MANAGER_ROLES } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

async function loadFullProject(id: string) {
  const rows = await query(
    `SELECT p.*,
            u.id AS mgr_id, u.name AS mgr_name, u.email AS mgr_email, u.image AS mgr_image,
            u.role AS mgr_role, u.department AS mgr_department, u.designation AS mgr_designation
     FROM projects p JOIN users u ON u.id = p.manager_id
     WHERE p.id = $1`,
    [id],
  );
  if (!rows[0]) return null;

  const [members, milestones, sprints, tags] = await Promise.all([
    query(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.allocation, pm.joined_at,
              u.id AS u_id, u.name AS u_name, u.email AS u_email, u.image AS u_image,
              u.role AS u_role, u.department AS u_department, u.designation AS u_designation
       FROM project_members pm JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [id],
    ),
    query(`SELECT * FROM milestones WHERE project_id = $1 ORDER BY due_date ASC`, [id]),
    query(`SELECT * FROM sprints WHERE project_id = $1 ORDER BY start_date ASC`, [id]),
    query(`SELECT * FROM project_tags WHERE project_id = $1`, [id]),
  ]);

  const {
    mgrId, mgrName, mgrEmail, mgrImage, mgrRole, mgrDepartment, mgrDesignation,
    ...proj
  } = toCamel(rows[0]);

  return {
    ...proj,
    manager: {
      id: mgrId, name: mgrName, email: mgrEmail, image: mgrImage,
      role: mgrRole, department: mgrDepartment, designation: mgrDesignation,
    },
    members: members.map(m => ({
      id: m.id, projectId: m.project_id, userId: m.user_id,
      role: m.role, allocation: m.allocation, joinedAt: m.joined_at,
      user: {
        id: m.u_id, name: m.u_name, email: m.u_email, image: m.u_image,
        role: m.u_role, department: m.u_department, designation: m.u_designation,
      },
    })),
    milestones: milestones.map(toCamel),
    sprints:    sprints.map(toCamel),
    tags:       tags.map(toCamel),
  };
}

// ── GET /api/projects/:id ─────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const project = await loadFullProject(id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isMember = project.members.some((m: any) => m.userId === session!.user.id);
  const isAdmin  = ['ADMIN', 'PROJECT_MANAGER'].includes(session!.user.role);
  if (!isMember && project.manager.id !== session!.user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(project);
}

// ── PATCH /api/projects/:id ───────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const { rows: existing } = await pool.query(`SELECT manager_id FROM projects WHERE id = $1`, [id]);
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = ['ADMIN', 'PROJECT_MANAGER'].includes(session!.user.role);
  if (existing[0].manager_id !== session!.user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const sets: string[] = [];
  const vals: any[]    = [];
  let i = 1;

  const addField = (col: string, val: any) => { sets.push(`${col} = $${i++}`); vals.push(val); };

  if (body.name              !== undefined) addField('name',               body.name);
  if (body.description       !== undefined) addField('description',        body.description);
  if (body.client            !== undefined) addField('client',             body.client);
  if (body.status            !== undefined) addField('status',             body.status);
  if (body.priority          !== undefined) addField('priority',           body.priority);
  if (body.startDate         !== undefined) addField('start_date',         new Date(body.startDate));
  if (body.endDate           !== undefined) addField('end_date',           new Date(body.endDate));
  if (body.budget            !== undefined) addField('budget',             body.budget ? parseFloat(body.budget) : null);
  if (body.completionPercent !== undefined) addField('completion_percent', parseInt(body.completionPercent));
  if (body.healthScore       !== undefined) addField('health_score',       parseInt(body.healthScore));
  if (body.riskLevel         !== undefined) addField('risk_level',         body.riskLevel);

  if (sets.length === 0) {
    return NextResponse.json(await loadFullProject(id));
  }

  vals.push(id);
  await pool.query(`UPDATE projects SET ${sets.join(', ')} WHERE id = $${i}`, vals);

  return NextResponse.json(await loadFullProject(id));
}

// ── DELETE /api/projects/:id (soft-delete) ────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole(MANAGER_ROLES);
  if (error) return error;
  const { id } = await params;

  const { rows } = await pool.query(`SELECT manager_id FROM projects WHERE id = $1`, [id]);
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canDelete = rows[0].manager_id === session!.user.id || session!.user.role === 'ADMIN';
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await pool.query(`UPDATE projects SET is_archived = true WHERE id = $1`, [id]);
  return new NextResponse(null, { status: 204 });
}
