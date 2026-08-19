import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cached } from '@/lib/cache'
import { isValidCategory, toSlug } from '@/lib/slug-utils'
import { getSessionIdFromRequest } from '@/lib/tracking'
import { CONSENT_COOKIE } from '@/lib/consent'

// GET - powers the default (no search/filter) view of /products: instead of
// one flat list of thousands of products, the page is split into portions —
// one row per category, plus a personalized "Recommended For You" row when
// the visitor has accepted the cookie-consent banner and has browsing
// history. Mirrors the shape ProductsClient.tsx's flat grid already uses so
// the same product card renders both views.

const PORTION_SIZE = 10
const MAX_PORTIONS = 12

// A function, not a module-level constant — the discount window filter
// needs "now" evaluated per-request, not once when the route module is
// first loaded into a long-lived server process.
function productSelect(now: Date) {
  return {
    id: true,
    productName: true,
    genericName: true,
    category: true,
    image: { select: { url: true, alt: true, publicId: true } },
    company: { select: { companyName: true } },
    // No `take` here — the client picks the cheapest priced variant itself
    // (pickCheapestVariant in product-card-utils.ts), same as the main
    // /api/product listing does; limiting to one row server-side risked
    // handing it a null-priced variant instead of the actual cheapest one.
    variants: { select: { id: true, packingVolume: true, customerPrice: true } },
    discounts: {
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    },
  } as const
}

async function getTopCategories() {
  // Same query shape as /products' own nav-data cache (products:nav-data) —
  // duplicated under its own key because this endpoint has its own TTL/shape
  // needs (ordered list capped differently) rather than reusing that page's
  // local cache entry.
  return cached('products:portions:categories', 1800, async () => {
    try {
      const rows = await prisma.$queryRaw<{ category: string; count: bigint }[]>`
        SELECT category, COUNT(*) as count FROM Product
        WHERE isActive = 1 AND category IS NOT NULL AND category != ''
        GROUP BY category HAVING count >= 5 ORDER BY count DESC
      `
      return rows
        .filter((r) => isValidCategory(r.category, Number(r.count)))
        .map((r) => ({ category: r.category, count: Number(r.count) }))
    } catch {
      return []
    }
  })
}

async function getCategoryPortion(category: string, country: string | null, now: Date) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      approvalStatus: 'APPROVED',
      category,
      ...(country && country !== 'all' ? { company: { country } } : {}),
    },
    orderBy: [{ isFeatured: 'desc' }, { rankingScore: 'desc' }, { createdAt: 'desc' }],
    take: PORTION_SIZE,
    select: productSelect(now),
  })
  return products
}

// Recently viewed categories for this visitor, most recent first — used to
// both build the "Recommended For You" row and reorder the category
// portions so what the visitor actually browses floats to the top.
async function getPersonalization(sessionId: string | null, now: Date) {
  if (!sessionId) return { viewedCategories: [], recommended: [] as Awaited<ReturnType<typeof getCategoryPortion>> }

  const recentViews = await prisma.trackingEvent.findMany({
    where: { type: 'PRODUCT_VIEW', sessionId, productId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { productId: true },
  })
  const viewedIds = Array.from(new Set(recentViews.map((v) => v.productId as number))).slice(0, 5)
  if (viewedIds.length === 0) return { viewedCategories: [], recommended: [] }

  const viewedProducts = await prisma.product.findMany({
    where: { id: { in: viewedIds } },
    select: { category: true },
  })
  const viewedCategories = Array.from(new Set(viewedProducts.map((p) => p.category).filter(Boolean))) as string[]
  if (viewedCategories.length === 0) return { viewedCategories: [], recommended: [] }

  const recommended = await prisma.product.findMany({
    where: {
      isActive: true,
      approvalStatus: 'APPROVED',
      category: { in: viewedCategories },
      id: { notIn: viewedIds },
    },
    orderBy: [{ rankingScore: 'desc' }, { createdAt: 'desc' }],
    take: PORTION_SIZE,
    select: productSelect(now),
  })

  return { viewedCategories, recommended }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')
    const consented = request.cookies.get(CONSENT_COOKIE)?.value === 'accepted'
    const sessionId = consented ? getSessionIdFromRequest(request) : null
    const now = new Date()

    const [topCategories, personalization] = await Promise.all([
      getTopCategories(),
      getPersonalization(sessionId, now),
    ])

    // Visited categories first (personalized order), then the rest by
    // catalog popularity — falls back to plain popularity order for anyone
    // who declined consent or has no history yet.
    const orderedCategories = [
      ...personalization.viewedCategories.filter((c) => topCategories.some((t) => t.category === c)),
      ...topCategories.map((t) => t.category).filter((c) => !personalization.viewedCategories.includes(c)),
    ].slice(0, MAX_PORTIONS)

    const portionResults = await Promise.all(
      orderedCategories.map(async (category) => ({
        category,
        slug: toSlug(category),
        products: await getCategoryPortion(category, country, now),
      }))
    )

    const portions = portionResults.filter((p) => p.products.length > 0)

    return NextResponse.json({
      recommended: personalization.recommended.length > 0 ? personalization.recommended : null,
      portions,
    })
  } catch (error) {
    console.error('Error building product portions:', error)
    return NextResponse.json({ recommended: null, portions: [] })
  }
}
