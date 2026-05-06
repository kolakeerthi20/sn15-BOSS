import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, MANAGER_ROLES } from '@/lib/auth-helpers';

const FULL_INCLUDE = {
  manager: { select: { id: true, name: true, email: true, image: true, role: true, department: true, designation: true } },
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, image: true, role: true, department: true, designation: true } },
    },
  },
  milestones: { orderBy: { dueDate: 'asc' as const } },
  sprints: { orderBy: { startDate: 'asc' as const } },
  tags: true,
  tasks: {
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      reporter: { select: { id: true, name: true, email: true, image: true } },
      subtasks: { orderBy: { position: 'asc' as const } },
      tags: true,
    },
    orderBy: { position: 'asc' as const },
  },
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id }, include: FULL_INCLUDE });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check access
  const isMember = project.members.some(m => m.userId === session!.user.id);
  const isManager = project.managerId === session!.user.id;
  const isAdmin = ['ADMIN', 'PROJECT_MANAGER'].includes(session!.user.role);
  if (!isMember && !isManager && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canEdit = project.managerId === session!.user.id || ['ADMIN', 'PROJECT_MANAGER'].includes(session!.user.role);
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, description, client, status, priority, startDate, endDate, budget, completionPercent, healthScore, riskLevel } = body;

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(client !== undefined && { client }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
      ...(completionPercent !== undefined && { completionPercent: parseInt(completionPercent) }),
      ...(healthScore !== undefined && { healthScore: parseInt(healthScore) }),
      ...(riskLevel && { riskLevel }),
    },
    include: { manager: true, members: { include: { user: true } }, milestones: true, tags: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireRole(MANAGER_ROLES);
  if (error) return error;
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canDelete = project.managerId === session!.user.id || session!.user.role === 'ADMIN';
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.project.update({ where: { id }, data: { isArchived: true } });
  return new NextResponse(null, { status: 204 });
}
