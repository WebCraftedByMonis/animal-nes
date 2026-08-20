import { prisma } from '@/lib/prisma'

// Computes Product.rankingScore for every active, approved product from the
// last 30 days of TrackingEvent + order + review signals, weighted by the
// single-row RankingSettings config (admin-editable, never hard-coded —
// see /dashboard/ranking-settings). Used by the admin "Recalculate Now"
// button; the nightly cron path (compute-rankings.js at the repo root)
// mirrors this same math in plain JS since it runs outside the Next build,
// the same way generate-sitemaps.js already mirrors slug-utils.ts.
//
// This score powers the DEFAULT sort order everyone sees (products page,
// homepage) — it is not personalized per visitor. A per-visitor
// "recommended for you" layer is a separate, later feature.

const WINDOW_DAYS = 30

function minMaxNormalize(values: number[]): (v: number) => number {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return () => (max === 0 ? 0 : 0.5)
  return (v: number) => (v - min) / (max - min)
}

export async function computeRankingScores(): Promise<{ updated: number }> {
  const settings = await prisma.rankingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })

  const now0 = new Date()

  // Housekeeping: sponsorships that have run their course stop counting as
  // ACTIVE. Cheap to do here since this already runs nightly (or on-demand
  // via "Recalculate Now") and touches Product/ranking data anyway.
  await prisma.productSponsorship.updateMany({
    where: { status: 'ACTIVE', endDate: { lt: now0 } },
    data: { status: 'EXPIRED' },
  })

  const sponsorshipSettings = await prisma.sponsorshipSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })
  const activeSponsorships = await prisma.productSponsorship.findMany({
    where: { status: 'ACTIVE', startDate: { lte: now0 }, endDate: { gte: now0 } },
    select: { productId: true },
  })
  const sponsoredProductIds = new Set(activeSponsorships.map((s) => s.productId))

  const since = new Date()
  since.setDate(since.getDate() - WINDOW_DAYS)

  const products = await prisma.product.findMany({
    where: { isActive: true, approvalStatus: 'APPROVED' },
    select: {
      id: true,
      createdAt: true,
      partner: { select: { isPremium: true, createdAt: true } },
      company: { select: { createdAt: true } },
    },
  })

  if (products.length === 0) return { updated: 0 }

  const productIds = products.map((p) => p.id)

  const [impressionRows, viewRows, clickRows, salesRows, reviewRows] = await Promise.all([
    prisma.trackingEvent.groupBy({
      by: ['productId'],
      where: { type: 'PRODUCT_IMPRESSION', productId: { in: productIds }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.trackingEvent.groupBy({
      by: ['productId'],
      where: { type: 'PRODUCT_VIEW', productId: { in: productIds }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.trackingEvent.groupBy({
      by: ['productId'],
      where: { type: 'PRODUCT_CLICK', productId: { in: productIds }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.checkoutItem.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, checkout: { createdAt: { gte: since } } },
      _sum: { quantity: true },
    }),
    prisma.productReview.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, isApproved: true },
      _avg: { rating: true },
    }),
  ])

  const impMap = new Map(impressionRows.map((r) => [r.productId as number, r._count._all]))
  const viewMap = new Map(viewRows.map((r) => [r.productId as number, r._count._all]))
  const clickMap = new Map(clickRows.map((r) => [r.productId as number, r._count._all]))
  const salesMap = new Map(salesRows.map((r) => [r.productId as number, r._sum.quantity || 0]))
  const reviewMap = new Map(reviewRows.map((r) => [r.productId as number, r._avg.rating || 0]))

  const now = Date.now()
  const ageDaysOf = (d: Date) => (now - d.getTime()) / 86400000

  const raw = products.map((p) => {
    const impressions = impMap.get(p.id) || 0
    const views = viewMap.get(p.id) || 0
    const clicks = clickMap.get(p.id) || 0
    const salesQty = salesMap.get(p.id) || 0
    const avgRating = reviewMap.get(p.id) || 0
    const ctr = impressions > 0 ? clicks / impressions : 0
    const conversion = views > 0 ? salesQty / views : 0
    const ageDays = ageDaysOf(p.createdAt)
    const vendorAgeDays = Math.min(
      p.partner?.createdAt ? ageDaysOf(p.partner.createdAt) : Infinity,
      p.company?.createdAt ? ageDaysOf(p.company.createdAt) : Infinity
    )

    return {
      id: p.id,
      relevance: impressions + views * 2,
      conversion,
      ctr,
      salesQty,
      freshness: 1 / (1 + ageDays / 30),
      sellerQuality: p.partner?.isPremium ? 1 : 0.3,
      reviews: avgRating > 0 ? avgRating / 5 : 0.5,
      isNew: ageDays <= settings.boostDurationDays,
      isNewVendor: vendorAgeDays <= settings.boostDurationDays,
      isSponsored: sponsoredProductIds.has(p.id),
    }
  })

  const normRelevance = minMaxNormalize(raw.map((r) => r.relevance))
  const normConversion = minMaxNormalize(raw.map((r) => r.conversion))
  const normCtr = minMaxNormalize(raw.map((r) => r.ctr))
  const normSales = minMaxNormalize(raw.map((r) => r.salesQty))

  const totalWeight =
    settings.relevanceWeight +
      settings.conversionWeight +
      settings.ctrWeight +
      settings.salesVelocityWeight +
      settings.freshnessWeight +
      settings.sellerQualityWeight +
      settings.reviewsWeight +
      settings.explorationWeight || 1

  const updates = raw.map((r) => {
    let score =
      ((settings.relevanceWeight * normRelevance(r.relevance) +
        settings.conversionWeight * normConversion(r.conversion) +
        settings.ctrWeight * normCtr(r.ctr) +
        settings.salesVelocityWeight * normSales(r.salesQty) +
        settings.freshnessWeight * r.freshness +
        settings.sellerQualityWeight * r.sellerQuality +
        settings.reviewsWeight * r.reviews +
        settings.explorationWeight * Math.random()) /
        totalWeight) *
      100

    const eligibleForBoost =
      (settings.newProductBoostEnabled && r.isNew) || (settings.newVendorBoostEnabled && r.isNewVendor)
    if (eligibleForBoost) {
      score *= settings.boostMultiplier
    }

    // Paid sponsorship boost stacks on top — a vendor paying to promote a
    // brand-new listing should get both, not one or the other.
    if (r.isSponsored) {
      score *= sponsorshipSettings.rankingBoostMultiplier
    }

    return { id: r.id, score: Math.round(score * 100) / 100 }
  })

  await prisma.$transaction(
    updates.map((u) =>
      prisma.product.update({
        where: { id: u.id },
        data: { rankingScore: u.score, rankingScoreUpdatedAt: new Date() },
      })
    )
  )

  return { updated: updates.length }
}
