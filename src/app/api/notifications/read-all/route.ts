import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function POST() {
  const { error, session } = await requireAuth();
  if (error) return error;

  await pool.query(
    `UPDATE notifications SET is_read = true, read_at = NOW()
     WHERE user_id = $1 AND is_read = false`,
    [session!.user.id],
  );

  return NextResponse.json({ ok: true });
}
