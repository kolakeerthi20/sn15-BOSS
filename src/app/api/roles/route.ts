import { NextRequest, NextResponse } from 'next/server';
import pool, { query, toCamel } from '@/lib/db';
import { requireRole } from '@/lib/auth-helpers';
import type { UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT_VIEWER'];

// ── GET /api/roles ────────────────────────────────────────────

export async function GET() {
  const { error } = await requireRole(['ADMIN']);
  if (error) return error;

  const [mappings, users] = await Promise.all([
    query(`SELECT * FROM email_role_mappings ORDER BY email ASC`),
    query(
      `SELECT id, email, name, image, role, department, designation, last_login_at
       FROM users ORDER BY email ASC`,
    ),
  ]);

  return NextResponse.json({
    mappings: mappings.map(toCamel),
    users:    users.map(toCamel),
  });
}

// ── POST /api/roles ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(['ADMIN']);
  if (error) return error;

  const body = await req.json();
  const { email, role, notes } = body;

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 },
    );
  }

  const normalizedEmail = (email as string).toLowerCase().trim();

  // Upsert mapping
  const { rows: mapping } = await pool.query(
    `INSERT INTO email_role_mappings (id, email, role, notes, created_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, notes = EXCLUDED.notes, created_by = EXCLUDED.created_by
     RETURNING *`,
    [crypto.randomUUID(), normalizedEmail, role, notes ?? null, session!.user.id],
  );

  // Apply to existing user if already signed in
  const { rows: existing } = await pool.query(
    `UPDATE users SET role = $1 WHERE email = $2 RETURNING id`,
    [role, normalizedEmail],
  );

  return NextResponse.json(
    { mapping: toCamel(mapping[0]), userUpdated: existing.length > 0 },
    { status: 201 },
  );
}

// ── DELETE /api/roles?email=xxx ───────────────────────────────

export async function DELETE(req: NextRequest) {
  const { error } = await requireRole(['ADMIN']);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  await pool.query(
    `DELETE FROM email_role_mappings WHERE email = $1`,
    [email.toLowerCase()],
  );
  return new NextResponse(null, { status: 204 });
}
