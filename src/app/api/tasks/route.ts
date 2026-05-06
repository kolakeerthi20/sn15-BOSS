import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

const TASK_INCLUDE = {
  assignee: { select: { id: true, name: true, email: true, image: true, designation: true } },
  reporter: { select: { id: true, name: true, email: true, image: true } },
  subtasks: { orderBy: { position: 'asc' as const } },
  tags: true,
  project: { select: { id: true, name: true, status: true } },
} as const;

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');
  const assigneeId = searchParams.get('assigneeId');
  const myTasks = searchParams.get('myTasks') === 'true';

  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (status && status !== 'ALL') where.status = status;
  if (assigneeId) where.assigneeId = assigneeId;
  if (myTasks) where.assigneeId = session!.user.id;

  // Employees can only see tasks in their projects
  if (session!.user.role === 'EMPLOYEE') {
    where.project = { members: { some: { userId: session!.user.id } } };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: TASK_INCLUDE,
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { projectId, title, description, assigneeId, priority, startDate, dueDate, estimatedHours, tags, subtasks, milestoneId, sprintId } = body;

  if (!projectId || !title || !assigneeId) {
    return NextResponse.json({ error: 'projectId, title, assigneeId are required' }, { status: 400 });
  }

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      projectId,
      title,
      description,
      assigneeId,
      reporterId: session!.user.id,
      priority: priority ?? 'MEDIUM',
      status: 'NOT_STARTED',
      ...(startDate && { startDate: new Date(startDate) }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
      ...(milestoneId && { milestoneId }),
      ...(sprintId && { sprintId }),
      tags: tags?.length ? { create: tags.map((t: string) => ({ tag: t })) } : undefined,
      subtasks: subtasks?.length
        ? { create: subtasks.map((s: string, i: number) => ({ title: s, position: i })) }
        : undefined,
    },
    include: TASK_INCLUDE,
  });

  // Notify assignee
  if (assigneeId !== session!.user.id) {
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned to you',
        message: `"${title}" has been assigned to you in ${project.name}`,
        link: `/tasks`,
      },
    });
  }

  return NextResponse.json(task, { status: 201 });
}
