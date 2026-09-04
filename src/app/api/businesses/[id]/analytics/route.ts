import { NextResponse } from 'next/server';
import { getSessionUser, checkUserBusinessPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay, parseISO } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = await checkUserBusinessPermission(user.id, params.id, 'sales:view');
  if (!allowed) return NextResponse.json({ error: 'Forbidden: Missing sales:view permission' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  // Default to last 7 days
  const endDate = endDateStr ? parseISO(endDateStr) : new Date();
  const startDate = startDateStr ? parseISO(startDateStr) : subDays(endDate, 6);

  const rangeStart = startOfDay(startDate);
  const rangeEnd = endOfDay(endDate);

  // Fetch all non-cancelled orders in range
  const orders = await prisma.order.findMany({
    where: {
      businessId: params.id,
      status: { not: 'CANCELLED' },
      createdAt: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Calculate summary metrics
  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Generate daily points for line/bar chart
  const daysInterval = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const salesOverTime = daysInterval.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayDisplay = format(day, 'MMM dd');

    const dayOrders = orders.filter(
      (o) => format(new Date(o.createdAt), 'yyyy-MM-dd') === dayStr
    );

    const revenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const count = dayOrders.length;

    return {
      date: dayStr,
      displayDate: dayDisplay,
      revenue,
      orderCount: count,
    };
  });

  // Calculate Pie chart sales breakdown by product
  const productMap: Record<string, { name: string; revenue: number; count: number }> = {};

  orders.forEach((ord) => {
    ord.items.forEach((item) => {
      const prodName = item.product.name;
      const itemTotal = item.quantity * item.priceAtOrder;
      if (!productMap[prodName]) {
        productMap[prodName] = { name: prodName, revenue: 0, count: 0 };
      }
      productMap[prodName].revenue += itemTotal;
      productMap[prodName].count += item.quantity;
    });
  });

  const salesByProduct = Object.values(productMap);

  // Calendar Heatmap data (for full month around selected range or past 30 days)
  const heatmapStart = subDays(rangeEnd, 29); // 30-day heatmap window
  const heatmapOrders = await prisma.order.findMany({
    where: {
      businessId: params.id,
      status: { not: 'CANCELLED' },
      createdAt: {
        gte: startOfDay(heatmapStart),
        lte: rangeEnd,
      },
    },
  });

  const heatmapInterval = eachDayOfInterval({ start: startOfDay(heatmapStart), end: rangeEnd });
  const heatmapData = heatmapInterval.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayOrders = heatmapOrders.filter(
      (o) => format(new Date(o.createdAt), 'yyyy-MM-dd') === dayStr
    );

    const revenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const count = dayOrders.length;
    // 🔥 Any day with > 10 orders/sales gets fire icon
    const hasFireIcon = count > 10;

    return {
      date: dayStr,
      revenue,
      orderCount: count,
      hasFireIcon,
    };
  });

  return NextResponse.json({
    summary: {
      totalSales,
      totalOrders,
      avgOrderValue,
    },
    salesOverTime,
    salesByProduct,
    heatmapData,
  });
}
