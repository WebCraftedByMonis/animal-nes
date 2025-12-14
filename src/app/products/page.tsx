import { Metadata } from 'next'
import { Suspense } from 'react'
import ProductsClient from '@/components/ProductsClient'
import { Skeleton } from '@/components/ui/skeleton'

// Make this page dynamic - no ISR caching
export const dynamic = 'force-dynamic'

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
    images: ['/products-og.jpg'],
  },
  alternates: {
    canonical: '/products',
  },
}

function ProductsPageSkeleton() {
  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <Skeleton className="h-8 w-48 mx-auto" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Skeleton */}
        <div className="w-full lg:w-64 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>

        {/* Products Grid Skeleton */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 16 }).map((_, i) => (
              <Skeleton key={i} className="h-[350px] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AllProductsPage() {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-green-500">All Products</h1>
        <ProductsClient />
      </div>
    </Suspense>
  )
}
