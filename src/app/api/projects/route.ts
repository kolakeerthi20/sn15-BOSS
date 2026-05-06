import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, MANAGER_ROLES } from '@/lib/auth-helpers';

const PROJECT_INCLUDE = {
  manager: { select: { id: true, name: true, email: true, image: true, role: true, department: true, designation: true } },
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, image: true, role: true, department: true, designation: true } },
    },
  },
  milestones: { orderBy: { dueDate: 'asc' as const } },
  tags: true,
  _count: { select: { tasks: true } },
} as const;

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const where: any = { isArchived: false };

  // Employees see only projects they're members of
  if (session!.user.role === 'EMPLOYEE' || session!.user.role === 'TEAM_LEAD') {
    where.members = { some: { userId: session!.user.id } };
  }
  if (status && status !== 'ALL') where.status = status;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const projects = await prisma.project.findMany({
    where,
    include: PROJECT_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(MANAGER_ROLES);
  if (error) return error;

  const body = await req.json();
  const { name, description, client, startDate, endDate, budget, priority, memberIds, tags } = body;

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: 'name, startDate, endDate are required' }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      client,
      managerId: session!.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budget: budget ? parseFloat(budget) : null,
      priority: priority ?? 'MEDIUM',
      status: 'PLANNING',
      members: memberIds?.length
        ? { create: [{ userId: session!.user.id, role: 'LEAD' }, ...memberIds.map((id: string) => ({ userId: id, role: 'MEMBER' }))] }
        : { create: [{ userId: session!.user.id, role: 'LEAD' }] },
      tags: tags?.length
        ? { create: tags.map((t: string) => ({ tag: t })) }
        : undefined,
    },
    include: PROJECT_INCLUDE,
  });

  return NextResponse.json(project, { status: 201 });
}
