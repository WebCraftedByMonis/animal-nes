import { Metadata } from 'next'
import ProductsClient from '@/components/ProductsClient'

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

export default function AllProductsPage() {
  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">All Products</h1>
      <ProductsClient />
    </div>
  )
}
