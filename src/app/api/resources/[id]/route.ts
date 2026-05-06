import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, MANAGER_ROLES } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userSkills: true,
      projectMembers: { include: { project: { select: { id: true, name: true, status: true } } } },
      assignedTasks: {
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      },
      dailyLogs: {
        orderBy: { date: 'desc' },
        take: 10,
        include: { project: { select: { id: true, name: true } } },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const body = await req.json();
  const { role, department, designation, billableRate, isActive } = body;

  // Only admins can change roles, managers can update other fields
  if (role && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can change user roles' }, { status: 403 });
  }

  // Users can update their own profile, managers can update anyone
  const isSelf = session!.user.id === id;
  const canEdit = isSelf || ['ADMIN', 'PROJECT_MANAGER'].includes(session!.user.role);
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role && { role }),
      ...(department !== undefined && { department }),
      ...(designation !== undefined && { designation }),
      ...(billableRate !== undefined && { billableRate: billableRate ? parseFloat(billableRate) : null }),
      ...(isActive !== undefined && { isActive }),
    },
    select: { id: true, name: true, email: true, role: true, department: true, designation: true },
  });

  return NextResponse.json(updated);
}
