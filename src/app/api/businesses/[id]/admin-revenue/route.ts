import { NextResponse } from 'next/server';
import { getSessionUser, checkUserBusinessPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await checkUserBusinessPermission(user.id, params.id, 'sales:view');
  if (!access.allowed) return NextResponse.json({ error: 'Missing sales access' }, { status: 403 });
  const admins = await prisma.adminBusinessAccess.findMany({
    where: { businessId: params.id, user: { role: 'ADMIN', active: true } },
    select: { user: { select: { id: true, name: true, username: true, email: true, revenueBalances: { where: { businessId: params.id }, select: { amount: true } } } } },
    orderBy: { user: { name: 'asc' } },
  });
  return NextResponse.json({ admins: admins.map(({ user }) => ({ id: user.id, name: user.name, username: user.username, email: user.email, amount: user.revenueBalances[0]?.amount || 0 })) });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await checkUserBusinessPermission(user.id, params.id, 'revenue:manage');
  if (!access.allowed) return NextResponse.json({ error: 'Missing permission to manage admin revenue' }, { status: 403 });
  const { adminId, amount } = await request.json();
  const value = Number(amount);
  if (!adminId || !Number.isFinite(value) || value < 0) return NextResponse.json({ error: 'Admin and a non-negative amount are required' }, { status: 400 });
  const assigned = await prisma.adminBusinessAccess.findUnique({ where: { userId_businessId: { userId: adminId, businessId: params.id } } });
  if (!assigned) return NextResponse.json({ error: 'Admin is not assigned to this business' }, { status: 404 });
  const balance = await prisma.adminRevenueBalance.upsert({ where: { userId_businessId: { userId: adminId, businessId: params.id } }, create: { userId: adminId, businessId: params.id, amount: value }, update: { amount: value } });
  return NextResponse.json({ amount: balance.amount });
}
