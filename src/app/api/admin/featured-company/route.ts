import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary'
import { computeRankingScores } from '@/lib/ranking'

// GET - current featured-company spotlight config (creates the default
// empty row on first read, same singleton pattern as ranking-settings /
// sponsorship-settings).
export async function GET() {
  try {
    const featured = await prisma.featuredCompany.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
      include: {
        company: { select: { id: true, companyName: true, country: true } },
      },
    })
    return NextResponse.json({ featured })
  } catch (error) {
    console.error('Error fetching featured company:', error)
    return NextResponse.json({ error: 'Failed to fetch featured company' }, { status: 500 })
  }
}

// PUT - set/clear the spotlighted company, its banner, and copy. Multipart
// form so a new banner image can ride along. Recomputes ranking scores
// immediately after saving so the shop-page boost (or its removal) is live
// right away instead of waiting for the nightly cron.
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()

    const companyIdRaw = formData.get('companyId')
    const companyId = companyIdRaw && String(companyIdRaw).trim() !== '' ? parseInt(String(companyIdRaw), 10) : null
    const isActive = formData.get('isActive') === 'true'
    const tagline = formData.get('tagline') ? String(formData.get('tagline')) : null
    const ctaText = formData.get('ctaText') ? String(formData.get('ctaText')) : 'Shop Now'
    const rankingBoostMultiplierRaw = formData.get('rankingBoostMultiplier')
    const rankingBoostMultiplier = rankingBoostMultiplierRaw ? parseFloat(String(rankingBoostMultiplierRaw)) : 3.0
    const removeBanner = formData.get('removeBanner') === 'true'
    const bannerImage = formData.get('bannerImage') as File | null

    if (companyId !== null) {
      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) {
        return NextResponse.json({ error: 'Selected company was not found' }, { status: 400 })
      }
    }

    const existing = await prisma.featuredCompany.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    })

    const data: {
      companyId: number | null
      isActive: boolean
      tagline: string | null
      ctaText: string
      rankingBoostMultiplier: number
      bannerImageUrl?: string | null
      bannerImagePublicId?: string | null
    } = {
      companyId,
      isActive,
      tagline,
      ctaText,
      rankingBoostMultiplier: Number.isFinite(rankingBoostMultiplier) ? rankingBoostMultiplier : 3.0,
    }

    if (bannerImage && bannerImage.size > 0) {
      if (existing.bannerImagePublicId) {
        await deleteFromCloudinary(existing.bannerImagePublicId).catch(() => {})
      }
      const buffer = Buffer.from(await bannerImage.arrayBuffer())
      const uploaded = await uploadImage(buffer, 'featured-company', bannerImage.name)
      data.bannerImageUrl = uploaded.secure_url
      data.bannerImagePublicId = uploaded.public_id
    } else if (removeBanner) {
      if (existing.bannerImagePublicId) {
        await deleteFromCloudinary(existing.bannerImagePublicId).catch(() => {})
      }
      data.bannerImageUrl = null
      data.bannerImagePublicId = null
    }

    const featured = await prisma.featuredCompany.update({
      where: { id: 1 },
      data,
      include: {
        company: { select: { id: true, companyName: true, country: true } },
      },
    })

    const { updated } = await computeRankingScores()

    // Homepage is ISR-cached (30 min) — force it to pick up the new banner
    // right away instead of waiting out the window.
    try {
      revalidatePath('/')
    } catch (revalidateError) {
      console.error('Failed to revalidate homepage after featured-company update:', revalidateError)
    }

    return NextResponse.json({ success: true, featured, rankingUpdated: updated })
  } catch (error) {
    console.error('Error updating featured company:', error)
    return NextResponse.json({ error: 'Failed to update featured company' }, { status: 500 })
  }
}
