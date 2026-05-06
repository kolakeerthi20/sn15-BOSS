import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  // Last 7 days productivity
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const productivity = await Promise.all(
    days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const [logs, tasksCompleted] = await Promise.all([
        prisma.dailyLog.aggregate({
          where: { date: { gte: day, lt: nextDay } },
          _sum: { hoursWorked: true },
          _count: true,
        }),
        prisma.task.count({
          where: { status: 'COMPLETED', updatedAt: { gte: day, lt: nextDay } },
        }),
      ]);

      return {
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tasksCompleted,
        hoursLogged: Number(logs._sum.hoursWorked ?? 0),
        logsSubmitted: logs._count,
      };
    })
  );

  return NextResponse.json(productivity);
}
