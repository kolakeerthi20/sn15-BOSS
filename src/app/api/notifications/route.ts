import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const notifications = await prisma.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return NextResponse.json(notifications);
}
