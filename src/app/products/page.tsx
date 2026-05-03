import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import ProductsClient from '@/components/ProductsClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800

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

async function getAllProducts() {
  try {
    const res = await fetch(`${getApiUrl()}/api/product?limit=500&sortBy=createdAt&sortOrder=desc`, {
      next: { revalidate: 1800 },
    })
    if (!res.ok) return []
    const json = await res.json()
    const data = json.data || json
    return Array.isArray(data) ? data.filter((p: any) => p.isActive !== false) : []
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
    itemListElement: products.map((p: any, index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        '@id': `${BASE_URL}/products/${p.id}`,
        name: p.productName,
        url: `${BASE_URL}/products/${p.id}`,
        ...(p.image?.url && { image: p.image.url }),
        ...(p.category && { category: p.category }),
        ...(p.variants?.[0]?.customerPrice && {
          offers: {
            '@type': 'Offer',
            price: p.variants[0].customerPrice,
            priceCurrency: 'PKR',
            availability: p.outofstock
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          },
        }),
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
