import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const productivity = await Promise.all(
    days.map(async day => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const [logs, completed] = await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(hours_worked), 0)::float AS hours, COUNT(*)::int AS count
           FROM daily_logs WHERE date >= $1 AND date < $2`,
          [day, nextDay],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count
           FROM tasks WHERE status = 'COMPLETED' AND updated_at >= $1 AND updated_at < $2`,
          [day, nextDay],
        ),
      ]);

      return {
        date:           day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tasksCompleted: completed.rows[0].count,
        hoursLogged:    logs.rows[0].hours,
        logsSubmitted:  logs.rows[0].count,
      };
    }),
  );

  return NextResponse.json(productivity);
}
