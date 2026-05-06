import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function POST(_req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  await prisma.notification.updateMany({
    where: { userId: session!.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
