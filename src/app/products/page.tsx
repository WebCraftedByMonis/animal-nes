import { prisma } from '@/lib/prisma'
import ProductsClient from '@/components/ProductsClient'

interface Product {
  id: number
  productName: string
  genericName: string | null
  category: string | null
  subCategory: string | null
  subsubCategory: string | null
  productType: string | null
  companyId: number
  partnerId: number
  description: string | null
  dosage: string | null
  productLink: string | null
  outofstock: boolean
  isFeatured: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  company: { companyName: string | null } | null
  partner: { partnerName: string } | null
  image: { url: string; alt: string; publicId: string | null } | null
  variants: { packingVolume: string | null; customerPrice: number | null; companyPrice?: number | null; dealerPrice?: number | null; inventory: number | null }[]
}

// ISR Configuration - revalidate every 60 seconds
export const revalidate = 60

// Generate static params for initial ISR generation (optional)
export async function generateStaticParams() {
  // Return empty array to generate on-demand
  return []
}

// Server Component with ISR
async function getInitialProducts(): Promise<{
  products: Product[]
  total: number
  minPrice: number
  maxPrice: number
}> {
  const limit = 16
  const page = 1
  const skip = (page - 1) * limit

  try {
    // Execute queries in parallel for better performance
    const [items, total, priceStats] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          company: true,
          partner: true,
          image: true,
          pdf: true,
          variants: true,
        }
      }),
      prisma.product.count({ 
        where: { isActive: true } 
      }),
      prisma.productVariant.aggregate({
        _min: { customerPrice: true },
        _max: { customerPrice: true },
        where: {
          product: {
            isActive: true
          }
        }
      })
    ])

    return {
      products: items as Product[],
      total,
      minPrice: priceStats._min.customerPrice || 0,
      maxPrice: priceStats._max.customerPrice || 100000,
    }
  } catch (error) {
    console.error('Error fetching initial products:', error)
    return {
      products: [],
      total: 0,
      minPrice: 0,
      maxPrice: 100000,
    }
  }
}

export default async function AllProductsPage() {
  const { products, total, minPrice, maxPrice } = await getInitialProducts()

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">All Products</h1>
      <ProductsClient 
        initialProducts={products}
        initialTotal={total}
        initialMinPrice={minPrice}
        initialMaxPrice={maxPrice}
      />
    </div>
  )
}
