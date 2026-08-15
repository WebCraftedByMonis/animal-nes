import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Powers /dashboard/analytics. Everything here reads from the single
// TrackingEvent table written by src/lib/tracking.ts — no per-feature
// counters to keep in sync.
export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const [byType, dailyRaw, topProducts, affiliateLeaderboard] = await Promise.all([
      prisma.trackingEvent.groupBy({
        by: ['type'],
        _count: { _all: true },
        where: { createdAt: { gte: since } },
      }),
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE(createdAt) as day, COUNT(*) as count
        FROM TrackingEvent
        WHERE createdAt >= ${since}
        GROUP BY DATE(createdAt)
        ORDER BY day ASC
      `,
      prisma.trackingEvent.groupBy({
        by: ['productId'],
        _count: { _all: true },
        where: { createdAt: { gte: since }, type: 'PRODUCT_VIEW', productId: { not: null } },
        orderBy: { _count: { productId: 'desc' } },
        take: 10,
      }),
      prisma.affiliatePartner.findMany({
        where: { status: 'APPROVED' },
        select: {
          id: true,
          name: true,
          _count: { select: { clicks: true, conversions: true } },
          commissions: { select: { amount: true } },
        },
        take: 50,
      }),
    ]);

    const productIds = topProducts.map((p) => p.productId).filter((id): id is number => id != null);
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, productName: true } })
      : [];
    const productNameById = new Map(products.map((p) => [p.id, p.productName]));

    const leaderboard = affiliateLeaderboard
      .map((a) => ({
        id: a.id,
        name: a.name,
        clicks: a._count.clicks,
        conversions: a._count.conversions,
        commission: a.commissions.reduce((sum, c) => sum + c.amount, 0),
      }))
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 10);

    return NextResponse.json({
      eventCountsByType: byType.map((t) => ({ type: t.type, count: t._count._all })),
      dailyCounts: dailyRaw.map((d) => ({ day: d.day, count: Number(d.count) })),
      topViewedProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productId != null ? productNameById.get(p.productId) || 'Unknown' : 'Unknown',
        views: p._count._all,
      })),
      affiliateLeaderboard: leaderboard,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
