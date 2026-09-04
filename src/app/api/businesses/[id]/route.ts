import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin() {
  const user = await getSessionUser();
  return user?.role === 'SUPER_ADMIN' ? user : null;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Only Super Admin can edit businesses' }, { status: 403 });
  try {
    const { name, icon, color } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    const existing = await prisma.business.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const duplicate = await prisma.business.findFirst({ where: { slug, id: { not: params.id } } });
    if (duplicate) return NextResponse.json({ error: 'A business with this name already exists' }, { status: 400 });
    const business = await prisma.business.update({ where: { id: params.id }, data: { name: name.trim(), slug, icon: icon || existing.icon, color: color || existing.color } });
    return NextResponse.json({ business });
  } catch {
    return NextResponse.json({ error: 'Failed to edit business' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Only Super Admin can delete businesses' }, { status: 403 });
  const business = await prisma.business.findUnique({ where: { id: params.id } });
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  await prisma.business.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
