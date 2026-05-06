import { NextRequest, NextResponse } from 'next/server';
import pool, { toCamel } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const { rows: existing } = await pool.query(
    `SELECT user_id FROM notifications WHERE id = $1`,
    [id],
  );
  if (!existing[0] || existing[0].user_id !== session!.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return NextResponse.json(toCamel(rows[0]));
}
