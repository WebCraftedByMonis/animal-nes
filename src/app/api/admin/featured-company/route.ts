import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { computeRankingScores } from '@/lib/ranking'

const companyInclude = {
  company: { select: { id: true, companyName: true, country: true, image: { select: { url: true } } } },
} as const

// GET - current featured-company spotlight config (creates the default
// empty row on first read, same singleton pattern as ranking-settings /
// sponsorship-settings).
export async function GET() {
  try {
    const featured = await prisma.featuredCompany.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
      include: companyInclude,
    })
    return NextResponse.json({ featured })
  } catch (error) {
    console.error('[featured-company] GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch featured company' }, { status: 500 })
  }
}

// PUT - set/clear the spotlighted company and its copy. No banner upload —
// the banner is always the selected company's own CompanyImage (see
// getFeaturedCompany() in src/app/page.tsx), read live at render time.
export async function PUT(request: NextRequest) {
  const startedAt = Date.now()
  try {
    const body = await request.json()
    console.log('[featured-company] PUT body:', body)

    const companyId = body.companyId ? parseInt(String(body.companyId), 10) : null
    const isActive = !!body.isActive
    const tagline = body.tagline ? String(body.tagline) : null
    const ctaText = body.ctaText ? String(body.ctaText) : 'Shop Now'
    const rankingBoostMultiplierRaw = body.rankingBoostMultiplier
    const rankingBoostMultiplier = rankingBoostMultiplierRaw ? parseFloat(String(rankingBoostMultiplierRaw)) : 3.0

    if (companyId !== null) {
      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) {
        console.warn('[featured-company] rejected: company not found', companyId)
        return NextResponse.json({ error: 'Selected company was not found' }, { status: 400 })
      }
    }

    await prisma.featuredCompany.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })

    const featured = await prisma.featuredCompany.update({
      where: { id: 1 },
      data: {
        companyId,
        isActive,
        tagline,
        ctaText,
        rankingBoostMultiplier: Number.isFinite(rankingBoostMultiplier) ? rankingBoostMultiplier : 3.0,
      },
      include: companyInclude,
    })
    console.log(`[featured-company] saved in ${Date.now() - startedAt}ms:`, {
      companyId: featured.companyId,
      isActive: featured.isActive,
    })

    // Homepage is ISR-cached (30 min) — force it to pick up the change now.
    try {
      revalidatePath('/')
    } catch (revalidateError) {
      console.error('[featured-company] revalidatePath("/") failed:', revalidateError)
    }

    // Ranking recompute walks every active product (tens of thousands in
    // production) — that took long enough to make the Save button look
    // stuck when it was awaited here. Kick it off in the background instead
    // (this runs under pm2 as a persistent Node process, not a serverless
    // function, so the promise keeps running after the response is sent)
    // and let the nightly cron / "Recalculate Now" on /dashboard/ranking-
    // settings be the source of truth for exactly when it finished.
    computeRankingScores()
      .then(({ updated }) => console.log(`[featured-company] background ranking recompute done: ${updated} products`))
      .catch((err) => console.error('[featured-company] background ranking recompute failed:', err))

    return NextResponse.json({ success: true, featured })
  } catch (error) {
    console.error('[featured-company] PUT failed:', error)
    return NextResponse.json({ error: 'Failed to update featured company' }, { status: 500 })
  }
}
