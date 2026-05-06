import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const department = searchParams.get('department');

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(search && { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ]}),
      ...(department && department !== 'ALL' && { department }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      department: true,
      designation: true,
      billableRate: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      userSkills: { select: { skill: true, level: true } },
      projectMembers: {
        where: { project: { isArchived: false, status: { in: ['ACTIVE', 'AT_RISK', 'PLANNING'] } } },
        include: { project: { select: { id: true, name: true, status: true } } },
      },
      assignedTasks: {
        where: { status: { not: 'COMPLETED' }, project: { isArchived: false } },
        select: { id: true, title: true, status: true, priority: true, dueDate: true },
        orderBy: { dueDate: 'asc' },
      },
      _count: {
        select: {
          assignedTasks: true,
          dailyLogs: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}
