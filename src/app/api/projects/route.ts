import { NextRequest, NextResponse } from 'next/server';
import pool, { query, toCamel } from '@/lib/db';
import { requireAuth, requireRole, MANAGER_ROLES } from '@/lib/auth-helpers';

// ── Shared relation loader ────────────────────────────────────

async function loadProjectRelations(ids: string[]) {
  if (ids.length === 0) return { members: [], milestones: [], tags: [], taskCounts: [] };

  const [members, milestones, tags, taskCounts] = await Promise.all([
    query(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.allocation, pm.joined_at,
              u.id AS u_id, u.name AS u_name, u.email AS u_email, u.image AS u_image,
              u.role AS u_role, u.department AS u_department, u.designation AS u_designation
       FROM project_members pm JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ANY($1)`,
      [ids],
    ),
    query(
      `SELECT * FROM milestones WHERE project_id = ANY($1) ORDER BY due_date ASC`,
      [ids],
    ),
    query(`SELECT * FROM project_tags WHERE project_id = ANY($1)`, [ids]),
    query(
      `SELECT project_id, COUNT(*)::int AS count FROM tasks WHERE project_id = ANY($1) GROUP BY project_id`,
      [ids],
    ),
  ]);
  return { members, milestones, tags, taskCounts };
}

function buildProjects(rows: any[], relations: Awaited<ReturnType<typeof loadProjectRelations>>) {
  const { members, milestones, tags, taskCounts } = relations;

  return rows.map(row => {
    const {
      mgrId, mgrName, mgrEmail, mgrImage, mgrRole, mgrDepartment, mgrDesignation,
      ...proj
    } = toCamel(row);

    const projectId = proj.id;

    // Parse NUMERIC columns (pg returns them as strings)
    if (proj.budget != null)          proj.budget          = parseFloat(proj.budget);
    if (proj.spentBudget != null)     proj.spentBudget     = parseFloat(proj.spentBudget);
    if (proj.completionPercent != null) proj.completionPercent = parseFloat(proj.completionPercent);
    if (proj.healthScore != null)     proj.healthScore     = parseFloat(proj.healthScore);

    return {
      ...proj,
      manager: {
        id: mgrId, name: mgrName, email: mgrEmail, image: mgrImage,
        role: mgrRole, department: mgrDepartment, designation: mgrDesignation,
      },
      members: members
        .filter(m => m.project_id === projectId)
        .map(m => ({
          id: m.id, projectId: m.project_id, userId: m.user_id,
          role: m.role, allocation: m.allocation, joinedAt: m.joined_at,
          user: {
            id: m.u_id, name: m.u_name, email: m.u_email, image: m.u_image,
            role: m.u_role, department: m.u_department, designation: m.u_designation,
          },
        })),
      milestones: milestones.filter(m => m.project_id === projectId).map(toCamel),
      tags:       tags.filter(t => t.project_id === projectId).map(toCamel),
      _count: {
        tasks: taskCounts.find(tc => tc.project_id === projectId)?.count ?? 0,
      },
    };
  });
}

// ── GET /api/projects ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const conditions: string[] = ['p.is_archived = false'];
  const params: any[] = [];
  let i = 1;

  const role = session!.user.role;
  if (role === 'EMPLOYEE' || role === 'TEAM_LEAD') {
    conditions.push(
      `p.id IN (SELECT project_id FROM project_members WHERE user_id = $${i++})`,
    );
    params.push(session!.user.id);
  }
  if (status && status !== 'ALL') {
    conditions.push(`p.status = $${i++}`);
    params.push(status);
  }
  if (search) {
    conditions.push(`p.name ILIKE $${i++}`);
    params.push(`%${search}%`);
  }

  const where = conditions.join(' AND ');
  const rows = await query(
    `SELECT p.*,
            u.id AS mgr_id, u.name AS mgr_name, u.email AS mgr_email, u.image AS mgr_image,
            u.role AS mgr_role, u.department AS mgr_department, u.designation AS mgr_designation
     FROM projects p JOIN users u ON u.id = p.manager_id
     WHERE ${where}
     ORDER BY p.updated_at DESC`,
    params,
  );

  const relations = await loadProjectRelations(rows.map(r => r.id));
  return NextResponse.json(buildProjects(rows, relations));
}

// ── POST /api/projects ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(MANAGER_ROLES);
  if (error) return error;

  const body = await req.json();
  const { name, description, client, startDate, endDate, budget, priority, memberIds, tags } = body;

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: 'name, startDate, endDate are required' }, { status: 400 });
  }

  const client_ = await pool.connect();
  try {
    await client_.query('BEGIN');
    const id = crypto.randomUUID();

    const { rows } = await client_.query(
      `INSERT INTO projects
         (id, name, description, client, manager_id, start_date, end_date, budget, priority, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PLANNING')
       RETURNING *`,
      [id, name, description ?? null, client ?? null, session!.user.id,
       startDate, endDate, budget ? parseFloat(budget) : null, priority ?? 'MEDIUM'],
    );

    // Always add manager as LEAD
    const memberList = [
      { userId: session!.user.id, role: 'LEAD' },
      ...(memberIds ?? []).map((uid: string) => ({ userId: uid, role: 'MEMBER' })),
    ];
    for (const m of memberList) {
      await client_.query(
        `INSERT INTO project_members (id, project_id, user_id, role)
         VALUES ($1,$2,$3,$4) ON CONFLICT (project_id, user_id) DO NOTHING`,
        [crypto.randomUUID(), id, m.userId, m.role],
      );
    }

    if (tags?.length) {
      for (const tag of tags as string[]) {
        await client_.query(
          `INSERT INTO project_tags (id, project_id, tag) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [crypto.randomUUID(), id, tag],
        );
      }
    }

    await client_.query('COMMIT');

    const projectRows = await query(
      `SELECT p.*,
              u.id AS mgr_id, u.name AS mgr_name, u.email AS mgr_email, u.image AS mgr_image,
              u.role AS mgr_role, u.department AS mgr_department, u.designation AS mgr_designation
       FROM projects p JOIN users u ON u.id = p.manager_id
       WHERE p.id = $1`,
      [id],
    );
    const relations = await loadProjectRelations([id]);
    return NextResponse.json(buildProjects(projectRows, relations)[0], { status: 201 });
  } catch (e: any) {
    await client_.query('ROLLBACK');
    console.error('[POST /api/projects]', e);
    return NextResponse.json({ error: e?.message ?? 'Internal server error' }, { status: 500 });
  } finally {
    client_.release();
  }
}
