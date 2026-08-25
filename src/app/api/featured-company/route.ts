import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cached } from '@/lib/cache'

// Public, cached read of the current homepage/shop-page spotlight — just
// enough for client components (e.g. ProductsClient's "Featured Brand"
// badge) to know which company is boosted right now, without exposing the
// admin-only PUT endpoint. Empty object when nothing is active.
export async function GET() {
  try {
    const featured = await cached('featured-company:public', 300, async () => {
      const row = await prisma.featuredCompany.findUnique({
        where: { id: 1 },
        include: { company: { select: { id: true, companyName: true, image: { select: { url: true } } } } },
      })
      if (!row || !row.isActive || !row.company) return null
      return {
        companyId: row.company.id,
        companyName: row.company.companyName,
        tagline: row.tagline,
        ctaText: row.ctaText,
        // No dedicated banner upload — always the company's own logo/image.
        bannerImageUrl: row.company.image?.url ?? null,
      }
    })
    return NextResponse.json({ featured })
  } catch (error) {
    console.error('Error fetching public featured company:', error)
    return NextResponse.json({ featured: null })
  }
}
