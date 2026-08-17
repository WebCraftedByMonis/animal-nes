// compute-rankings.js
// Recomputes Product.rankingScore for every active, approved product from
// the last 30 days of visitor behavior, order, and review data, weighted by
// the single-row RankingSettings config (edit at /dashboard/ranking-settings
// — never hard-code weights here).
//
// Mirrors src/lib/ranking.ts's math — duplicated in plain JS because this
// runs outside the Next build via cron, the same way generate-sitemaps.js
// already mirrors slug-utils.ts for the same reason.
//
// Run once manually, then set a nightly cron on VPS:
//   30 2 * * * cd /var/www/animalwellness/animal-nes && node compute-rankings.js >> /var/log/ranking-compute.log 2>&1

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const WINDOW_DAYS = 30

function minMaxNormalize(values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return () => (max === 0 ? 0 : 0.5)
  return (v) => (v - min) / (max - min)
}

async function main() {
  console.log(`[${new Date().toISOString()}] Computing ranking scores...`)

  const settings = await prisma.rankingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })

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

  if (products.length === 0) {
    console.log('No active/approved products to score. Done.')
    return
  }

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

  const impMap = new Map(impressionRows.map((r) => [r.productId, r._count._all]))
  const viewMap = new Map(viewRows.map((r) => [r.productId, r._count._all]))
  const clickMap = new Map(clickRows.map((r) => [r.productId, r._count._all]))
  const salesMap = new Map(salesRows.map((r) => [r.productId, r._sum.quantity || 0]))
  const reviewMap = new Map(reviewRows.map((r) => [r.productId, r._avg.rating || 0]))

  const now = Date.now()
  const ageDaysOf = (d) => (now - new Date(d).getTime()) / 86400000

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
      p.partner && p.partner.createdAt ? ageDaysOf(p.partner.createdAt) : Infinity,
      p.company && p.company.createdAt ? ageDaysOf(p.company.createdAt) : Infinity
    )

    return {
      id: p.id,
      relevance: impressions + views * 2,
      conversion,
      ctr,
      salesQty,
      freshness: 1 / (1 + ageDays / 30),
      sellerQuality: p.partner && p.partner.isPremium ? 1 : 0.3,
      reviews: avgRating > 0 ? avgRating / 5 : 0.5,
      isNew: ageDays <= settings.boostDurationDays,
      isNewVendor: vendorAgeDays <= settings.boostDurationDays,
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

  console.log(`[${new Date().toISOString()}] Scored ${updates.length} products.`)
}

main()
  .catch((err) => {
    console.error('Fatal:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
