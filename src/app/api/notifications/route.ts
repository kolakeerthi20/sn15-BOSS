import { NextResponse } from 'next/server';
import { query, toCamel } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const rows = await query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [session!.user.id],
  );

  return NextResponse.json(rows.map(toCamel));
}
