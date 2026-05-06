import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: true,
      reporter: true,
      subtasks: { orderBy: { position: 'asc' } },
      tags: true,
      comments: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'asc' },
      },
      project: { select: { id: true, name: true } },
    },
  });

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: { include: { members: true } } },
  });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { status, priority, progressPercent, title, description, assigneeId, dueDate, estimatedHours, actualHours } = body;

  // Subtask toggle
  if (body.subtaskId !== undefined && body.completed !== undefined) {
    await prisma.subTask.update({
      where: { id: body.subtaskId },
      data: { completed: body.completed, completedAt: body.completed ? new Date() : null },
    });
    return NextResponse.json({ ok: true });
  }

  const oldStatus = task.status;

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(progressPercent !== undefined && { progressPercent: parseInt(progressPercent) }),
      ...(assigneeId && { assigneeId }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(estimatedHours !== undefined && { estimatedHours: parseFloat(estimatedHours) }),
      ...(actualHours !== undefined && { actualHours: parseFloat(actualHours) }),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true, designation: true } },
      reporter: { select: { id: true, name: true, email: true, image: true } },
      subtasks: true,
      tags: true,
    },
  });

  // Audit log
  if (status && status !== oldStatus) {
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        taskId: id,
        projectId: task.projectId,
        action: 'task.status.changed',
        entityType: 'Task',
        entityId: id,
        oldValue: { status: oldStatus },
        newValue: { status },
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canDelete = task.reporterId === session!.user.id || ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'].includes(session!.user.role);
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.task.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
