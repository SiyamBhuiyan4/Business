import { NextResponse } from 'next/server';
import { getSessionUser, signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Only Super Admin can impersonate users' }, { status: 403 });
  const { userId } = await request.json();
  const target = await prisma.user.findFirst({ where: { id: userId, role: 'ADMIN', active: true } });
  if (!target) return NextResponse.json({ error: 'Active admin not found' }, { status: 404 });
  const token = await signToken({ userId: target.id, email: target.email, role: target.role, name: target.name });
  const response = NextResponse.json({ success: true, redirect: '/admin/dashboard' });
  response.cookies.set('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24, path: '/' });
  return response;
}
