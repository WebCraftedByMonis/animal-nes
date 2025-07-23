'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'


interface Product {
  id: number
  productName: string
  genericName: string | null
  category: string
  subCategory: string
  subsubCategory?: string
  productType: string
  companyId: number
  partnerId: number
  description: string | null
  dosage: string | null
  slug: string
  isActive: boolean
  createdAt: string
  company: {
    companyName: string
  }
  partner: {
    partnerName: string
  }
  image: {
    url: string
    alt: string
    publicId: string | null
  } | null
  variants: {
    packingVolume: string
    customerPrice: number
  }[]
}



export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'productName'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(7)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const router = useRouter()

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/product', {
        params: { 
          search, 
          sortBy, 
          sortOrder, 
          page, 
          limit,
          fields: 'id,productName,genericName,category,subCategory,productType,company,partner,image,slug,variants'

        },
      })
console.log(data)
 const activeProducts = data.data.filter((product: Product) => product.isActive)
    setProducts(activeProducts)
      setTotal(data.total)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-')
    setSortBy(sortBy as 'id' | 'productName')
    setSortOrder(sortOrder as 'asc' | 'desc')
  }

  const navigateToProduct = (product: Product) => {
    // You can use either slug or ID for navigation
    // Using slug if available, otherwise fall back to ID
    const path = product.slug ? `/products/${product.slug}` : `/products/${product.id}`
    router.push(path)
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">All Products</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:ring-green-500 max-w-md"
          />
          <Select 
            value={`${sortBy}-${sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id-asc">ID (Ascending)</SelectItem>
              <SelectItem value="id-desc">ID (Descending)</SelectItem>
              <SelectItem value="productName-asc">Name (A-Z)</SelectItem>
              <SelectItem value="productName-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <span>Show</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              {[7, 24, 48, 96].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>entries</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigateToProduct(product)}
              >
                {product.image && (
                  <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3">
                    <Image
                      src={product.image.url}
                      alt={product.image.alt || product.productName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-bold text-lg line-clamp-2 ">{product.productName}</h3>
                  {product.genericName && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{product.genericName}</p>
                  )}
                  
                 <div className="space-y-1">
  {product.variants.map((variant, idx) => (
    <div key={idx} className="flex gap-2 items-center">
      <Badge variant="outline" className="text-green-600 border-green-600">
        {variant.packingVolume} – PKR {variant.customerPrice}
      </Badge>
    </div>
  ))}
</div>


                  <div className="text-sm text-muted-foreground line-clamp-1">
                    <span className="font-medium">By:</span> {product.company?.companyName}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}

          {total > limit && (
            <div className="mt-6 flex justify-center gap-2">
              <Button 
                variant="outline" 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, Math.ceil(total / limit)) }, (_, i) => {
                let pageNum
                if (Math.ceil(total / limit) <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= Math.ceil(total / limit) - 2) {
                  pageNum = Math.ceil(total / limit) - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    onClick={() => setPage(pageNum)}
                    className={pageNum === page ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}