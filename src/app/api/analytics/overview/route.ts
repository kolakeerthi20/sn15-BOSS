import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(session!.user.role);

  const projectWhere = isManager
    ? { isArchived: false }
    : { isArchived: false, members: { some: { userId: session!.user.id } } };

  const [
    totalProjects, activeProjects, atRiskProjects,
    totalUsers, activeUsers,
    overdueTasks, inProgressTasks, blockedTasks,
    todayLogs,
  ] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.project.count({ where: { ...projectWhere, status: 'ACTIVE' } }),
    prisma.project.count({ where: { ...projectWhere, status: 'AT_RISK' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, lastLoginAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { not: 'COMPLETED' }, project: projectWhere } }),
    prisma.task.count({ where: { status: 'IN_PROGRESS', project: projectWhere } }),
    prisma.task.count({ where: { status: 'BLOCKED', project: projectWhere } }),
    prisma.dailyLog.count({ where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);

  // Upcoming deadlines (next 7 days)
  const upcomingDeadlines = await prisma.task.count({
    where: {
      dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
      status: { not: 'COMPLETED' },
      project: projectWhere,
    },
  });

  return NextResponse.json({
    totalProjects,
    activeProjects,
    delayedProjects: atRiskProjects,
    totalResources: totalUsers,
    activeResources: activeUsers,
    avgUtilization: 0, // computed client-side from task load
    tasksCompletedToday: todayLogs,
    upcomingDeadlines,
    overdueTasks,
    inProgressTasks,
    blockedTasks,
    productivityScore: 0, // computed from daily logs
    burnRate: 0,
  });
}
