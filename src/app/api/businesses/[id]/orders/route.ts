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
  const deliveredDate = searchParams.get('deliveredDate');

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

  if (deliveredDate) {
    const dayStart = new Date(`${deliveredDate}T00:00:00.000`);
    const dayEnd = new Date(`${deliveredDate}T23:59:59.999`);
    whereClause.status = 'DELIVERED';
    whereClause.deliveredAt = { gte: dayStart, lte: dayEnd };
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
    const body = await request.json();
    if (Array.isArray(body.bulkOrders)) {
      const rows = body.bulkOrders;
      if (!rows.length || rows.length > 500) return NextResponse.json({ error: 'Import must contain 1-500 valid rows' }, { status: 400 });
      const products = await prisma.product.findMany({ where: { businessId: params.id } });
      const productMap = new Map(products.flatMap((p) => [[p.id, p], ...(p.sku ? [[p.sku.toLowerCase(), p] as any] : []), [p.name.toLowerCase(), p] as any]));
      const data = [];
      for (const row of rows) {
        const product: any = productMap.get(String(row.Product_SKU_Or_Name).trim().toLowerCase());
        if (!product) return NextResponse.json({ error: `Product not found: ${row.Product_SKU_Or_Name}` }, { status: 400 });
        const quantity = Number(row.Quantity); const price = row.Unit_Price_BDT ? Number(row.Unit_Price_BDT) : product.unitPrice;
        if (!row.Customer_Name || !row.Contact_Number || !row.Delivery_Address || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'Bulk row contains invalid required values' }, { status: 400 });
        data.push({ businessId: params.id, createdByUserId: user.id, customerName: String(row.Customer_Name).trim(), customerContact: String(row.Contact_Number).trim(), deliveryAddress: String(row.Delivery_Address).trim(), expectedDeliveryDate: new Date(`${row.Expected_Delivery_Date}T12:00:00`), status: 'PENDING', orderType: 'SINGLE', totalAmount: quantity * price, notes: [row.Payment_Status ? `Payment: ${row.Payment_Status}` : '', row.Notes || ''].filter(Boolean).join(' — ') || null, items: { create: [{ productId: product.id, quantity, priceAtOrder: price }] } });
      }
      const created = await prisma.$transaction(data.map((order) => prisma.order.create({ data: order })));
      return NextResponse.json({ created: created.length });
    }
    const { customerName, customerContact, deliveryAddress, expectedDeliveryDate, items, notes } = body;

    if (!customerName || !customerContact || !deliveryAddress || !expectedDeliveryDate || !items || !items.length) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    // Derive orderType: SINGLE if 1 distinct product ID, MIXED if >1 distinct products
    const uniqueProductIds = new Set(items.map((i: any) => i.productId));
    const orderType = uniqueProductIds.size > 1 ? 'MIXED' : 'SINGLE';

    let totalAmount = 0;
    const itemData: { productId: string; quantity: number; priceAtOrder: number }[] = [];

    for (const item of items) {
      let prod = item.productId ? await prisma.product.findFirst({ where: { id: item.productId, businessId: params.id } }) : null;
      if (!prod && item.productName && parseFloat(item.priceAtOrder) > 0) {
        prod = await prisma.product.create({ data: { businessId: params.id, name: item.productName.trim(), unitPrice: parseFloat(item.priceAtOrder) || 0 } });
      }
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
    if (status) {
      updateData.status = status;
      updateData.deliveredAt = status === 'DELIVERED' ? new Date() : null;
    }
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
