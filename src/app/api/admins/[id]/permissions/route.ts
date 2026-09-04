import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admin can edit permissions' }, { status: 403 });
  }

  try {
    const { businessId, permissions, isAssigned } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const adminUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    if (isAssigned === false) {
      // Revoke access to business
      await prisma.adminBusinessAccess.deleteMany({
        where: { userId: params.id, businessId },
      });
      await prisma.adminPermission.deleteMany({
        where: { userId: params.id, businessId },
      });
      return NextResponse.json({ success: true });
    }

    // Ensure access record exists
    await prisma.adminBusinessAccess.upsert({
      where: {
        userId_businessId: { userId: params.id, businessId },
      },
      create: { userId: params.id, businessId },
      update: {},
    });

    // Update permissions matrix
    if (permissions && typeof permissions === 'object') {
      for (const [permKey, enabled] of Object.entries(permissions)) {
        await prisma.adminPermission.upsert({
          where: {
            userId_businessId_permissionKey: {
              userId: params.id,
              businessId,
              permissionKey: permKey,
            },
          },
          create: {
            userId: params.id,
            businessId,
            permissionKey: permKey,
            enabled: Boolean(enabled),
          },
          update: {
            enabled: Boolean(enabled),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update permissions error:', error);
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
}
