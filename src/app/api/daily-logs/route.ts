import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

const LOG_INCLUDE = {
  user: { select: { id: true, name: true, email: true, image: true, designation: true, department: true } },
  project: { select: { id: true, name: true } },
  task: { select: { id: true, title: true } },
  deliverables: true,
} as const;

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');       // YYYY-MM-DD
  const projectId = searchParams.get('projectId');
  const userId = searchParams.get('userId');
  const teamFeed = searchParams.get('teamFeed') === 'true';

  const where: any = {};

  if (date) {
    const d = new Date(date);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    where.date = { gte: d, lt: next };
  }
  if (projectId) where.projectId = projectId;

  if (userId) {
    where.userId = userId;
  } else if (!teamFeed) {
    // Default: show own logs
    where.userId = session!.user.id;
  }

  // Employees only see team-feed for their projects
  if (teamFeed && session!.user.role === 'EMPLOYEE') {
    const memberProjects = await prisma.projectMember.findMany({
      where: { userId: session!.user.id },
      select: { projectId: true },
    });
    where.projectId = { in: memberProjects.map(m => m.projectId) };
  }

  const logs = await prisma.dailyLog.findMany({
    where,
    include: LOG_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { projectId, taskId, status, summary, hoursWorked, blockers, tomorrowPlan, progressPercent, deliverables } = body;

  if (!projectId || !summary) {
    return NextResponse.json({ error: 'projectId and summary are required' }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const log = await prisma.dailyLog.create({
    data: {
      userId: session!.user.id,
      projectId,
      taskId: taskId || null,
      date: today,
      status: status ?? 'IN_PROGRESS',
      summary,
      hoursWorked: parseFloat(hoursWorked) || 0,
      blockers: blockers || null,
      tomorrowPlan: tomorrowPlan || null,
      progressPercent: parseInt(progressPercent) || 0,
      deliverables: deliverables?.filter(Boolean).length
        ? { create: deliverables.filter(Boolean).map((d: string) => ({ title: d })) }
        : undefined,
    },
    include: LOG_INCLUDE,
  });

  // Update task actualHours if linked
  if (taskId && hoursWorked) {
    await prisma.task.update({
      where: { id: taskId },
      data: { actualHours: { increment: parseFloat(hoursWorked) } },
    });
  }

  return NextResponse.json(log, { status: 201 });
}
