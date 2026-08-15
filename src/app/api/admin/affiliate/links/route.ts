import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Read-only oversight of every affiliate link generated on the site.
export async function GET() {
  try {
    const links = await prisma.affiliateLink.findMany({
      include: {
        affiliatePartner: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, productName: true } },
        _count: { select: { clicks: true, conversions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({
      links: links.map((l) => ({
        id: l.id,
        code: l.code,
        label: l.label,
        isActive: l.isActive,
        targetPath: l.targetPath,
        productName: l.product?.productName || null,
        affiliate: l.affiliatePartner,
        clickCount: l._count.clicks,
        conversionCount: l._count.conversions,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error('List affiliate links error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
