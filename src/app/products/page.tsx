import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import ProductsClient from '@/components/ProductsClient'
import { prisma } from '@/lib/prisma'
import { toSlug, isValidCategory, isValidBrand, toProductUrl } from '@/lib/slug-utils'
import { cached } from '@/lib/cache'

// Never pre-render at build time — 60k product rows time out the 60s build
// worker. Page is rendered on first request and cached by nginx/ISR.
export const dynamic = "force-dynamic"

const BASE_URL = 'https://animalwellness.shop'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const params = await searchParams
  const hasFilters = Object.keys(params).length > 0

  if (hasFilters) {
    return {
      robots: { index: false, follow: true },
    }
  }

  return {
    title: 'Veterinary Products & Pet Care Supplies - Buy Online',
    description: 'Browse our extensive collection of veterinary products, medicines, pet care supplies, and animal wellness solutions. Quality products from trusted brands with fast delivery across the region.',
    keywords: [
      'veterinary products', 'pet care supplies', 'animal medicines', 'veterinary supplies',
      'pet pharmacy', 'animal healthcare products', 'veterinary equipment', 'pet nutrition',
      'animal supplements', 'veterinary medicine online', 'pet care products', 'animal health'
    ],
    openGraph: {
      title: 'Veterinary Products & Pet Care Supplies - Animal Wellness',
      description: 'Browse our extensive collection of veterinary products, medicines, pet care supplies, and animal wellness solutions.',
      type: 'website',
      images: [{ url: `${BASE_URL}/logo.png`, width: 1200, height: 630, alt: 'Animal Wellness Products' }],
    },
    alternates: {
      canonical: '/products',
    },
  }
}

// This page is force-dynamic (see below) — no ISR — so without caching,
// every single visit re-ran this 5,000-row query. It only feeds an SEO nav
// block and barely changes minute to minute, so a 30-minute Redis cache
// (same window the homepage's ISR already uses) turns "every request hits
// the DB" into "one request every 30 minutes does."
async function getAllProducts() {
  return cached('products:seo-index', 1800, async () => {
    try {
      return await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, productName: true, genericName: true, category: true },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 5000,
      })
    } catch {
      return []
    }
  })
}

async function getNavData() {
  return cached('products:nav-data', 1800, async () => {
    try {
      const [catRows, brandRows] = await Promise.all([
        prisma.$queryRaw<{ category: string; count: bigint }[]>`
          SELECT category, COUNT(*) as count FROM Product
          WHERE isActive = 1 AND category IS NOT NULL AND category != ''
          GROUP BY category HAVING count >= 5 ORDER BY count DESC
        `,
        prisma.$queryRaw<{ id: number; companyName: string; count: bigint }[]>`
          SELECT c.id, c.companyName, COUNT(p.id) as count
          FROM Product p JOIN Company c ON p.companyId = c.id
          WHERE p.isActive = 1
          GROUP BY c.id, c.companyName HAVING count >= 50 ORDER BY count DESC
        `,
      ])
      // Convert BigInt -> number before this ever reaches JSON.stringify
      // (the cache, and the eventual response) — BigInt isn't serializable.
      const categories = catRows
        .filter(r => isValidCategory(r.category, Number(r.count)))
        .map(r => ({ category: r.category, count: Number(r.count) }))
      const brands = brandRows
        .filter(r => isValidBrand(r.companyName, Number(r.count)))
        .map(r => ({ id: r.id, companyName: r.companyName, count: Number(r.count) }))
      return { categories, brands }
    } catch {
      return { categories: [], brands: [] }
    }
  })
}

export default async function AllProductsPage() {
  const [products, { categories, brands }] = await Promise.all([getAllProducts(), getNavData()])

  const itemListData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Veterinary Products & Pet Care Supplies',
    description: 'Browse our extensive collection of veterinary products, medicines, and pet care supplies.',
    url: `${BASE_URL}/products`,
    numberOfItems: products.length,
    itemListElement: products.map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        '@id': `${BASE_URL}${toProductUrl(p)}`,
        name: p.productName,
        url: `${BASE_URL}${toProductUrl(p)}`,
        ...(p.category && { category: p.category }),
      },
    })),
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
      />
      <h1 className="text-2xl font-bold text-center text-green-500">All Products</h1>

      {/* Server-rendered index — crawlable by search engines, hidden from UI */}
      <nav aria-label="Product index" className="sr-only">
        {categories.length > 0 && (
          <section>
            <h2>Shop by Category</h2>
            <ul>
              {categories.map((c: any) => (
                <li key={c.category}>
                  <Link href={`/products/category/${toSlug(c.category)}`}>{c.category}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {brands.length > 0 && (
          <section>
            <h2>Shop by Brand</h2>
            <ul>
              {brands.map((b: any) => (
                <li key={b.id}>
                  <Link href={`/brands/${toSlug(b.companyName)}`}>{b.companyName}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {products.length > 0 && (
          <section>
            <h2>All Products</h2>
            <ul>
              {products.map((p: any) => (
                <li key={p.id}>
                  <Link href={toProductUrl(p)}>
                    {p.productName}
                    {p.genericName ? ` (${p.genericName})` : ''}
                    {p.category ? ` — ${p.category}` : ''}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </nav>

      <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading products...</div>}>
        <ProductsClient />
      </Suspense>
    </div>
  )
}
