import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionIdFromRequest } from '@/lib/tracking';
import { CONSENT_COOKIE } from '@/lib/consent';

// GET - a lightweight, category-based "Because You Viewed" rail for the
// homepage. Personalized per anonymous visitor (aw_sid cookie), so it's
// fetched client-side rather than baked into the ISR-cached page — see
// LandingPage.tsx. Not the full Recommendation Engine (similar-products,
// collaborative filtering, etc.) — just a first, contained slice of it.
//
// Gated on the cookie-consent banner (see consent.ts / CookieConsentBanner):
// a visitor who declined personalization gets an empty rail here, same as
// one with no browsing history yet.
export async function GET(request: NextRequest) {
  try {
    if (request.cookies.get(CONSENT_COOKIE)?.value !== 'accepted') {
      return NextResponse.json({ products: [] });
    }

    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return NextResponse.json({ products: [] });
    }

    // Most recently viewed products this visitor looked at, deduped.
    const recentViews = await prisma.trackingEvent.findMany({
      where: { type: 'PRODUCT_VIEW', sessionId, productId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { productId: true },
    });

    const viewedIds = Array.from(new Set(recentViews.map((v) => v.productId as number))).slice(0, 5);
    if (viewedIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const viewedProducts = await prisma.product.findMany({
      where: { id: { in: viewedIds } },
      select: { category: true },
    });
    const categories = Array.from(new Set(viewedProducts.map((p) => p.category).filter(Boolean))) as string[];

    if (categories.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        approvalStatus: 'APPROVED',
        category: { in: categories },
        id: { notIn: viewedIds },
      },
      orderBy: [{ rankingScore: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      include: {
        image: true,
        company: { select: { companyName: true } },
        variants: { select: { customerPrice: true }, take: 1 },
      },
    });

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        productName: p.productName,
        category: p.category,
        image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
        price: p.variants[0]?.customerPrice ?? null,
        companyName: p.company?.companyName ?? null,
      })),
    });
  } catch (error) {
    console.error('Error building "because you viewed" recommendations:', error);
    return NextResponse.json({ products: [] });
  }
}
