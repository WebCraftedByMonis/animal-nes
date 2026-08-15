// Lightweight product lookup for the affiliate "create link" picker. Only
// returns live, approved products, and skips ones explicitly disabled for
// the affiliate program.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 2) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      approvalStatus: 'APPROVED',
      productName: { contains: q },
      affiliateProduct: { is: null }, // no override row → eligible by default
    },
    select: { id: true, productName: true, category: true },
    take: 10,
  });

  // Also include products with an explicit override that's still enabled.
  const enabledOverrides = await prisma.product.findMany({
    where: {
      isActive: true,
      approvalStatus: 'APPROVED',
      productName: { contains: q },
      affiliateProduct: { is: { enabled: true } },
    },
    select: { id: true, productName: true, category: true },
    take: 10,
  });

  const byId = new Map<number, { id: number; productName: string; category: string | null }>();
  for (const p of [...products, ...enabledOverrides]) byId.set(p.id, p);

  return NextResponse.json({ products: Array.from(byId.values()).slice(0, 10) });
}
