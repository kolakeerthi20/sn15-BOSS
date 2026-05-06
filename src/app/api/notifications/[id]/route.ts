import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== session!.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
  return NextResponse.json(updated);
}
