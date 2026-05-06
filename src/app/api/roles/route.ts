import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireRole } from '@/lib/auth-helpers';
import type { UserRole } from '@prisma/client';

const VALID_ROLES: UserRole[] = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT_VIEWER'];

// GET /api/roles — list all email→role mappings (admin only)
export async function GET(_req: NextRequest) {
  const { error } = await requireRole(['ADMIN']);
  if (error) return error;

  const mappings = await prisma.emailRoleMapping.findMany({
    orderBy: { email: 'asc' },
  });

  // Also include existing signed-in users with their actual roles
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, image: true, role: true, department: true, designation: true, lastLoginAt: true },
    orderBy: { email: 'asc' },
  });

  return NextResponse.json({ mappings, users });
}

// POST /api/roles — upsert email→role mapping + update user if they exist (admin only)
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(['ADMIN']);
  if (error) return error;

  const body = await req.json();
  const { email, role, notes } = body;

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  if (!VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Upsert the mapping
  const mapping = await prisma.emailRoleMapping.upsert({
    where: { email: normalizedEmail },
    create: { email: normalizedEmail, role: role as UserRole, notes, createdBy: session!.user.id },
    update: { role: role as UserRole, notes, createdBy: session!.user.id },
  });

  // If the user has already signed in, update their role in the users table too
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { role: role as UserRole },
    });
  }

  return NextResponse.json({ mapping, userUpdated: !!existingUser }, { status: 201 });
}

// DELETE /api/roles?email=xxx — remove a mapping (admin only)
export async function DELETE(req: NextRequest) {
  const { error } = await requireRole(['ADMIN']);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  await prisma.emailRoleMapping.deleteMany({ where: { email: email.toLowerCase() } });
  return new NextResponse(null, { status: 204 });
}
