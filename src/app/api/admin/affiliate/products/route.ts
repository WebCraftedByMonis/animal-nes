import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Product catalogs on this site can be huge (scraped shops), so this always
// requires a search term rather than dumping the whole catalog — except it
// also always surfaces products that already have an affiliate override so
// admins can see/edit what they've configured.
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() || '';

    const [searchResults, overridden] = await Promise.all([
      q.length >= 2
        ? prisma.product.findMany({
            where: { productName: { contains: q } },
            select: { id: true, productName: true, category: true, isActive: true },
            take: 30,
          })
        : Promise.resolve([]),
      prisma.affiliateProduct.findMany({
        include: { product: { select: { id: true, productName: true, category: true, isActive: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ]);

    const overrideByProductId = new Map(overridden.map((o) => [o.productId, o]));

    const productMap = new Map<number, { id: number; productName: string; category: string | null; isActive: boolean }>();
    for (const p of searchResults) productMap.set(p.id, p);
    for (const o of overridden) if (o.product) productMap.set(o.product.id, o.product);

    const products = Array.from(productMap.values()).map((p) => {
      const override = overrideByProductId.get(p.id);
      return {
        id: p.id,
        productName: p.productName,
        category: p.category,
        isActive: p.isActive,
        enabled: override?.enabled ?? true,
        commissionType: override?.commissionType ?? null,
        commissionValue: override?.commissionValue ?? null,
        hasOverride: !!override,
      };
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('List affiliate products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, enabled, commissionType, commissionValue } = body;

    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    if (commissionType && !['PERCENTAGE', 'FIXED'].includes(commissionType)) {
      return NextResponse.json({ error: 'Invalid commission type' }, { status: 400 });
    }

    const data = {
      enabled: enabled ?? true,
      commissionType: commissionType || null,
      commissionValue: commissionValue === '' || commissionValue == null ? null : Number(commissionValue),
    };

    const affiliateProduct = await prisma.affiliateProduct.upsert({
      where: { productId: Number(productId) },
      update: data,
      create: { productId: Number(productId), ...data },
    });

    return NextResponse.json({ affiliateProduct });
  } catch (error) {
    console.error('Update affiliate product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
