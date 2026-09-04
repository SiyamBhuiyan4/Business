import { NextResponse } from 'next/server';
import { getSessionUser, checkUserBusinessPermission, verifyMutationApproval } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isExport = new URL(request.url).searchParams.get('forExport') === 'true';
  const { allowed } = await checkUserBusinessPermission(user.id, params.id, isExport ? 'pdf:export' : 'orders:view');
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const orderTypeFilter = searchParams.get('orderType');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const createdBy = searchParams.get('createdBy');

  const whereClause: any = {
    businessId: params.id,
  };

  if (statusFilter && statusFilter !== 'ALL') {
    whereClause.status = statusFilter;
  }

  if (orderTypeFilter && orderTypeFilter !== 'ALL') {
    whereClause.orderType = orderTypeFilter;
  }

  if (createdBy && createdBy !== 'ALL') {
    whereClause.createdByUserId = createdBy;
  }

  if (startDate || endDate) {
    whereClause.expectedDeliveryDate = {};
    if (startDate) {
      whereClause.expectedDeliveryDate.gte = new Date(startDate);
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      whereClause.expectedDeliveryDate.lte = eDate;
    }
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      items: {
        include: {
          product: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      expectedDeliveryDate: 'asc', // Soonest first
    },
  });

  return NextResponse.json({ orders });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = await checkUserBusinessPermission(user.id, params.id, 'orders:manage');
  if (!allowed) return NextResponse.json({ error: 'Forbidden: Missing orders:manage permission' }, { status: 403 });

  try {
    const { customerName, customerContact, deliveryAddress, expectedDeliveryDate, items, notes } = await request.json();

    if (!customerName || !customerContact || !deliveryAddress || !expectedDeliveryDate || !items || !items.length) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    // Derive orderType: SINGLE if 1 distinct product ID, MIXED if >1 distinct products
    const uniqueProductIds = new Set(items.map((i: any) => i.productId));
    const orderType = uniqueProductIds.size > 1 ? 'MIXED' : 'SINGLE';

    let totalAmount = 0;
    const itemData: { productId: string; quantity: number; priceAtOrder: number }[] = [];

    for (const item of items) {
      const prod = await prisma.product.findFirst({ where: { id: item.productId, businessId: params.id } });
      if (!prod) {
        return NextResponse.json({ error: 'Every product must belong to this business' }, { status: 400 });
      }

      const qty = parseInt(item.quantity) || 1;
      const price = item.priceAtOrder ? parseFloat(item.priceAtOrder) : prod.unitPrice;
      totalAmount += qty * price;

      itemData.push({
        productId: prod.id,
        quantity: qty,
        priceAtOrder: price,
      });
    }

    if (!itemData.length) {
      return NextResponse.json({ error: 'At least one valid product is required' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        businessId: params.id,
        createdByUserId: user.id,
        customerName: customerName.trim(),
        customerContact: customerContact.trim(),
        deliveryAddress: deliveryAddress.trim(),
        expectedDeliveryDate: new Date(expectedDeliveryDate),
        status: 'PENDING',
        orderType,
        totalAmount,
        notes: notes ? notes.trim() : null,
        items: {
          create: itemData,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { orderId, status, notes, customerName, customerContact, deliveryAddress, expectedDeliveryDate, items } = body;
    if (!(await verifyMutationApproval(body.confirmationPhrase, body.superAdminPassword))) return NextResponse.json({ error: 'Super Admin approval required' }, { status: 403 });
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

    if (status) {
      const { allowed } = await checkUserBusinessPermission(user.id, params.id, 'orders:status');
      if (!allowed) return NextResponse.json({ error: 'Forbidden: Missing orders:status permission' }, { status: 403 });
    } else {
      const { allowed } = await checkUserBusinessPermission(user.id, params.id, 'orders:manage');
      if (!allowed) return NextResponse.json({ error: 'Forbidden: Missing orders:manage permission' }, { status: 403 });
    }

    const existingOrder = await prisma.order.findFirst({ where: { id: orderId, businessId: params.id } });
    if (!existingOrder) return NextResponse.json({ error: 'Order not found in this business' }, { status: 404 });

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (customerName !== undefined) updateData.customerName = customerName.trim();
    if (customerContact !== undefined) updateData.customerContact = customerContact.trim();
    if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress.trim();
    if (expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = new Date(expectedDeliveryDate);

    if (items !== undefined) {
      if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'At least one product is required' }, { status: 400 });
      const productIds = Array.from(new Set(items.map((item: any) => item.productId))) as string[];
      const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId: params.id } });
      if (products.length !== productIds.length) return NextResponse.json({ error: 'Every product must belong to this business' }, { status: 400 });
      const productsById = new Map(products.map((product) => [product.id, product]));
      const itemData = items.map((item: any) => {
        const product = productsById.get(item.productId)!;
        const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
        return { productId: product.id, quantity, priceAtOrder: product.unitPrice };
      });
      updateData.orderType = productIds.length > 1 ? 'MIXED' : 'SINGLE';
      updateData.totalAmount = itemData.reduce((sum, item) => sum + item.quantity * item.priceAtOrder, 0);
      updateData.items = { deleteMany: {}, create: itemData };
    }

    const order = await prisma.order.update({
      where: { id: existingOrder.id },
      data: updateData,
      include: {
        items: {
          include: { product: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = await checkUserBusinessPermission(user.id, params.id, 'orders:manage');
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const body = await request.json().catch(() => ({}));
  if (!(await verifyMutationApproval(body.confirmationPhrase, body.superAdminPassword))) return NextResponse.json({ error: 'Super Admin approval required' }, { status: 403 });

  if (!orderId) return NextResponse.json({ error: 'orderId param required' }, { status: 400 });

  try {
    const result = await prisma.order.deleteMany({ where: { id: orderId, businessId: params.id } });
    if (!result.count) return NextResponse.json({ error: 'Order not found in this business' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
