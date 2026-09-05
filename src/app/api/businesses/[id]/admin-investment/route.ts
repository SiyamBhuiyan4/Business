import { NextResponse } from 'next/server';
import { getSessionUser, checkUserBusinessPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await checkUserBusinessPermission(user.id, params.id);
  if (!access.allowed) return NextResponse.json({ error: 'Business access required' }, { status: 403 });
  const admins = await prisma.adminBusinessAccess.findMany({
    where: { businessId: params.id, user: { role: 'ADMIN', active: true } },
    select: { user: { select: { id: true, name: true, username: true, email: true, investmentBalances: { where: { businessId: params.id }, select: { amount: true } } } } },
    orderBy: { user: { name: 'asc' } },
  });
  return NextResponse.json({ admins: admins.map(({ user }) => ({ id: user.id, name: user.name, username: user.username, email: user.email, amount: user.investmentBalances[0]?.amount || 0 })) });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await checkUserBusinessPermission(user.id, params.id, 'investment:manage');
  if (!access.allowed) return NextResponse.json({ error: 'Missing permission to manage investments' }, { status: 403 });
  const { adminId, amount } = await request.json();
  const value = Number(amount);
  if (!adminId || !Number.isFinite(value) || value < 0) return NextResponse.json({ error: 'Admin and a non-negative amount are required' }, { status: 400 });
  const assigned = await prisma.adminBusinessAccess.findUnique({ where: { userId_businessId: { userId: adminId, businessId: params.id } } });
  if (!assigned) return NextResponse.json({ error: 'Admin is not assigned to this business' }, { status: 404 });
  await prisma.adminInvestmentBalance.upsert({ where: { userId_businessId: { userId: adminId, businessId: params.id } }, create: { userId: adminId, businessId: params.id, amount: value }, update: { amount: value } });
  const total = await prisma.adminInvestmentBalance.aggregate({ where: { businessId: params.id }, _sum: { amount: true } });
  const investment = total._sum.amount || 0;
  await prisma.business.update({ where: { id: params.id }, data: { investment } });
  return NextResponse.json({ amount: value, total: investment });
}
