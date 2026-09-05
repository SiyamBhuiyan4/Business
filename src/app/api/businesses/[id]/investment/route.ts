import { NextResponse } from 'next/server';
import { getSessionUser, checkUserBusinessPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await checkUserBusinessPermission(user.id, params.id, 'investment:manage');
  if (!access.allowed) return NextResponse.json({ error: 'Missing permission to manage total invested' }, { status: 403 });
  const { investment } = await request.json();
  const value = Number(investment);
  if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: 'Investment must be a non-negative number' }, { status: 400 });
  const business = await prisma.business.update({ where: { id: params.id }, data: { investment: value }, select: { investment: true } });
  return NextResponse.json(business);
}
