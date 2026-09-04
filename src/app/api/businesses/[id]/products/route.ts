import { NextResponse } from 'next/server';
import { getSessionUser, checkUserBusinessPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = await checkUserBusinessPermission(user.id, params.id);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const products = await prisma.product.findMany({
    where: { businessId: params.id },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ products });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = await checkUserBusinessPermission(user.id, params.id, 'products:manage');
  if (!allowed) return NextResponse.json({ error: 'Forbidden: Missing products:manage permission' }, { status: 403 });

  try {
    const { name, unitPrice, sku, isAvailable } = await request.json();
    if (!name || unitPrice === undefined) {
      return NextResponse.json({ error: 'Name and Unit Price are required' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        businessId: params.id,
        name: name.trim(),
        unitPrice: parseFloat(unitPrice),
        sku: sku || null,
        isAvailable: isAvailable ?? true,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = await checkUserBusinessPermission(user.id, params.id, 'products:manage');
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { productId, name, unitPrice, sku, isAvailable } = await request.json();
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });

    const existingProduct = await prisma.product.findFirst({ where: { id: productId, businessId: params.id } });
    if (!existingProduct) return NextResponse.json({ error: 'Product not found in this business' }, { status: 404 });
    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        name: name?.trim(),
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        sku: sku !== undefined ? sku : undefined,
        isAvailable: isAvailable !== undefined ? isAvailable : undefined,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = await checkUserBusinessPermission(user.id, params.id, 'products:manage');
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  if (!productId) return NextResponse.json({ error: 'productId query param required' }, { status: 400 });

  try {
    const result = await prisma.product.deleteMany({ where: { id: productId, businessId: params.id } });
    if (!result.count) return NextResponse.json({ error: 'Product not found in this business' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
