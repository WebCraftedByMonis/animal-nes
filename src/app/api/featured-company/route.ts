import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cached } from '@/lib/cache'

// Public, cached read of the current homepage/shop-page spotlight — enough
// for client components (ProductsClient's "Featured Brand" badge + product
// carousel on /products) to know which company is boosted right now and
// show its top products, without exposing the admin-only PUT endpoint.
// Empty object when nothing is active.
export async function GET() {
  try {
    const featured = await cached('featured-company:public', 300, async () => {
      const row = await prisma.featuredCompany.findUnique({
        where: { id: 1 },
        include: { company: { select: { id: true, companyName: true, country: true, image: { select: { url: true } } } } },
      })
      if (!row || !row.isActive || !row.company) return null

      const products = await prisma.product.findMany({
        where: { isActive: true, approvalStatus: 'APPROVED', companyId: row.company.id },
        orderBy: [{ isFeatured: 'desc' }, { rankingScore: 'desc' }, { createdAt: 'desc' }],
        take: 12,
        select: {
          id: true,
          productName: true,
          category: true,
          image: { select: { url: true, alt: true } },
          variants: { select: { customerPrice: true }, take: 1 },
        },
      })

      return {
        companyId: row.company.id,
        companyName: row.company.companyName,
        // This endpoint is Redis-cached and identical for every visitor —
        // the visitor's actual country only exists client-side (useCountry()
        // has no server-readable signal), so ProductsClient does the match
        // against this field itself.
        country: row.company.country,
        tagline: row.tagline,
        ctaText: row.ctaText,
        // No dedicated banner upload — always the company's own logo/image.
        bannerImageUrl: row.company.image?.url ?? null,
        products: products.map((p) => ({
          id: p.id,
          productName: p.productName,
          category: p.category,
          image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
          price: p.variants[0]?.customerPrice ?? null,
        })),
      }
    })
    return NextResponse.json({ featured })
  } catch (error) {
    console.error('Error fetching public featured company:', error)
    return NextResponse.json({ featured: null })
  }
}
