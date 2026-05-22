import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import ProductsClient from '@/components/ProductsClient'
import { prisma } from '@/lib/prisma'

// Never pre-render at build time — 60k product rows time out the 60s build
// worker. Page is rendered on first request and cached by nginx/ISR.
export const dynamic = "force-dynamic"

const BASE_URL = 'https://www.animalwellness.shop'

export const metadata: Metadata = {
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
    images: [{ url: `${BASE_URL}/logo.jpg`, width: 1200, height: 630, alt: 'Animal Wellness Products' }],
  },
  alternates: {
    canonical: '/products',
  },
}

// Query the DB directly for the server-rendered product index.
// This list is used only for SEO link discovery (sr-only nav below) —
// the interactive product browser is handled client-side by ProductsClient.
// We select only the minimal fields needed and order by featured-first so the
// most important products appear earliest in the HTML.
async function getAllProducts() {
  try {
    // 5 000 featured-first links is enough for Googlebot to discover products.
    // Full discovery is handled by the sitemap index (/sitemap/1.xml … N.xml).
    return await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        productName: true,
        genericName: true,
        category: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    })
  } catch {
    return []
  }
}

export default async function AllProductsPage() {
  const products = await getAllProducts()

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
        '@id': `${BASE_URL}/products/${p.id}`,
        name: p.productName,
        url: `${BASE_URL}/products/${p.id}`,
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

      {/* Server-rendered product index — crawlable by search engines */}
      {products.length > 0 && (
        <nav aria-label="Product index" className="sr-only">
          <ul>
            {products.map((p: any) => (
              <li key={p.id}>
                <Link href={`/products/${p.id}`}>
                  {p.productName}
                  {p.genericName ? ` (${p.genericName})` : ''}
                  {p.category ? ` — ${p.category}` : ''}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading products...</div>}>
        <ProductsClient />
      </Suspense>
    </div>
  )
}
