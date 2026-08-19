'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import WishlistButton from '@/components/WishlistButton'
import QuickAddToCartButton from '@/components/QuickAddToCartButton'
import QuickBuyNowButton from '@/components/QuickBuyNowButton'
import { useCountry } from '@/contexts/CountryContext'
import { toProductUrl } from '@/lib/slug-utils'
import { track } from '@/lib/trackingClient'
import {
  pickCheapestVariant, getActiveDiscount, calculateDiscountedPrice,
  type DiscountLike, type VariantLike,
} from '@/lib/product-card-utils'

interface PortionProduct {
  id: number
  productName: string
  genericName: string | null
  category: string | null
  image: { url: string; alt: string; publicId: string | null } | null
  company: { companyName: string | null } | null
  variants: VariantLike[]
  discounts: DiscountLike[]
}

interface Portion {
  category: string
  slug: string
  products: PortionProduct[]
}

interface PortionsResponse {
  recommended: PortionProduct[] | null
  portions: Portion[]
}

// Default (no search/filter) view of the /products page: instead of one
// flat list of every product, the catalog is split into portions — a
// horizontally scrollable row per category, ranked and ordered by the
// visitor's own browsing history when they've accepted the cookie-consent
// banner (see /api/product/portions and consent.ts), popularity otherwise.
export default function ProductPortions() {
  const router = useRouter()
  const { country, currencySymbol } = useCountry()
  const [data, setData] = useState<PortionsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    axios
      .get('/api/product/portions', { params: { country } })
      .then(({ data }) => { if (!cancelled) setData(data) })
      .catch(() => { if (!cancelled) setData({ recommended: null, portions: [] }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [country])

  const navigateToProduct = (p: PortionProduct) => {
    track('PRODUCT_CLICK', { productId: p.id })
    router.push(toProductUrl(p))
  }

  if (loading) {
    return (
      <div className="space-y-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, j) => (<PortionCardSkeleton key={j} />))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const rows: { title: string; subtitle?: string; slug?: string; products: PortionProduct[] }[] = []
  if (data?.recommended && data.recommended.length > 0) {
    rows.push({ title: 'Recommended For You', subtitle: 'Picked from products you recently viewed', products: data.recommended })
  }
  for (const portion of data?.portions ?? []) {
    rows.push({ title: portion.category, slug: portion.slug, products: portion.products })
  }

  if (rows.length === 0) {
    return <div className="text-center py-12"><p className="text-muted-foreground">No products found</p></div>
  }

  return (
    <div className="space-y-10">
      {rows.map((row) => (
        <section key={row.title}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{row.title}</h2>
              {row.subtitle && <p className="text-sm text-muted-foreground">{row.subtitle}</p>}
            </div>
            {row.slug && (
              <Link
                href={`/products/category/${row.slug}`}
                className="flex items-center text-sm font-medium text-green-600 dark:text-green-400 hover:underline flex-shrink-0"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
            {row.products.map((product) => {
              const v = pickCheapestVariant(product.variants)
              const discount = getActiveDiscount(product.discounts, v?.id)
              const originalPrice = v?.customerPrice || 0
              const discountedPrice = discount ? calculateDiscountedPrice(originalPrice, discount.percentage) : originalPrice

              return (
                <div
                  key={product.id}
                  onClick={() => navigateToProduct(product)}
                  className={[
                    'snap-start flex-shrink-0 w-[180px] sm:w-[220px] cursor-pointer rounded-2xl overflow-hidden',
                    'bg-[#f0f0f3] dark:bg-zinc-900',
                    'shadow-[8px_8px_16px_#d1d9e6,_-8px_-8px_16px_#ffffff]',
                    'dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),_-8px_-8px_16px_rgba(255,255,255,0.05)]',
                    'border border-zinc-100/40 dark:border-zinc-800/60',
                    'transition-transform hover:scale-[1.02]',
                  ].join(' ')}
                >
                  {product.image && (
                    <div className="relative aspect-square w-full">
                      <Image
                        src={product.image.url.replace(/^http:\/\//, 'https://')}
                        alt={product.image.alt || product.productName}
                        fill
                        className="object-cover"
                        sizes="220px"
                        referrerPolicy="no-referrer"
                      />
                      {discount && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                            {discount.percentage}% OFF
                          </span>
                        </div>
                      )}
                      <WishlistButton productId={product.id} />
                      <div className="absolute bottom-2 right-2 z-10 flex gap-1.5">
                        <QuickAddToCartButton productId={product.id} variantId={v?.id} />
                        <QuickBuyNowButton productId={product.id} variantId={v?.id} />
                      </div>
                    </div>
                  )}

                  <div className="p-3 space-y-1.5">
                    <h3 className="font-semibold text-sm line-clamp-2 text-zinc-900 dark:text-zinc-100">{product.productName}</h3>

                    {v && v.customerPrice && v.customerPrice > 10 ? (
                      discount ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {currencySymbol} {discountedPrice.toLocaleString()}
                          </span>
                          <span className="text-xs text-zinc-500 line-through">
                            {currencySymbol} {originalPrice.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-green-700 border-green-600/40 bg-white/60 dark:bg-zinc-900/60 text-xs">
                          {currencySymbol} {v.customerPrice.toLocaleString()}
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-400/40 bg-orange-50/60 dark:bg-orange-900/20 text-xs">
                        Get Quote
                      </Badge>
                    )}

                    {product.company?.companyName && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">By: {product.company.companyName}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function PortionCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[180px] sm:w-[220px] rounded-2xl overflow-hidden bg-[#f0f0f3] dark:bg-zinc-900 border border-zinc-100/40 dark:border-zinc-800/60">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
