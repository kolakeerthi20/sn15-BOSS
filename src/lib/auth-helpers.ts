// Shared helpers for API route auth checks
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const { error, session } = await requireAuth();
  if (error || !session) return { error: error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export const MANAGER_ROLES: UserRole[] = ['ADMIN', 'PROJECT_MANAGER'];
export const LEAD_ROLES: UserRole[] = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'];
