import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let businesses;

  if (user.role === 'SUPER_ADMIN') {
    businesses = await prisma.business.findMany({
      orderBy: { createdAt: 'asc' },
    });
  } else {
    const assigned = await prisma.adminBusinessAccess.findMany({
      where: { userId: user.id },
      include: { business: true },
    });
    businesses = assigned.map((a) => a.business);
  }

  // Calculate today's sales & pending order counts for summary tiles
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const businessSummaries = await Promise.all(
    businesses.map(async (biz) => {
      const todaySalesResult = await prisma.order.aggregate({
        where: {
          businessId: biz.id,
          status: { not: 'CANCELLED' },
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        _sum: {
          totalAmount: true,
        },
      });

      const pendingOrdersCount = await prisma.order.count({
        where: {
          businessId: biz.id,
          status: 'PENDING',
        },
      });

      const totalProductsCount = await prisma.product.count({
        where: { businessId: biz.id },
      });

      return {
        ...biz,
        todaySales: todaySalesResult._sum.totalAmount || 0,
        pendingOrdersCount,
        totalProductsCount,
      };
    })
  );

  return NextResponse.json({ businesses: businessSummaries });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admin can create businesses' }, { status: 403 });
  }

  try {
    const { name, icon, color, products } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'A business with this name or slug already exists' }, { status: 400 });
    }

    const newBusiness = await prisma.business.create({
      data: {
        name: name.trim(),
        slug,
        icon: icon || 'building-2',
        color: color || 'emerald',
      },
    });

    // Create initial product list if provided
    if (Array.isArray(products) && products.length > 0) {
      for (const prod of products) {
        if (prod.name && prod.unitPrice) {
          await prisma.product.create({
            data: {
              businessId: newBusiness.id,
              name: prod.name,
              unitPrice: parseFloat(prod.unitPrice),
              sku: prod.sku || null,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, business: newBusiness });
  } catch (error) {
    console.error('Create business error:', error);
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
  }
}
