import { NextResponse } from 'next/server';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSION_LIST } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admin can manage admins' }, { status: 403 });
  }

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      businessAccess: {
        include: {
          business: true,
        },
      },
      permissions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ admins });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admin can create admin accounts' }, { status: 403 });
  }

  try {
    const { name, email, password, assignedBusinessIds } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, Email, and Password are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newAdmin = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Assign businesses and default permissions
    if (Array.isArray(assignedBusinessIds)) {
      for (const bizId of assignedBusinessIds) {
        await prisma.adminBusinessAccess.create({
          data: {
            userId: newAdmin.id,
            businessId: bizId,
          },
        });

        // Seed default permissions
        for (const p of PERMISSION_LIST) {
          await prisma.adminPermission.create({
            data: {
              userId: newAdmin.id,
              businessId: bizId,
              permissionKey: p.key,
              enabled: p.defaultForAdmin,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
