'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

interface Product {
  id: number
  productName: string
  description: string | null
  customerPrice: number
  isFeatured: boolean
  isActive: boolean
  image: {
    url: string
    alt: string
    publicId: string | null
  } | null
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const { data } = await axios.get('/api/product')
        console.log(data)
        const featuredProducts = data.data.filter((product: Product) => 
          product.isFeatured && product.isActive
        )
        setProducts(featuredProducts)
      } catch (error) {
        console.error(error)
        toast.error('Failed to fetch featured products')
      }
    }

    fetchFeaturedProducts()
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">Featured Products</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
            {product.image && (
              <div className="relative aspect-square w-full">
                <Image
                  src={product.image.url}
                  alt={product.image.alt || product.productName}
                  fill
                  className="rounded-lg object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            )}

            <h3 className="font-semibold text-lg">{product.productName}</h3>

            {product.description && (
              <p className="text-sm text-muted-foreground">{product.description}</p>
            )}

            <div className="flex justify-end">
              <Badge className="bg-green-500 hover:bg-green-600 text-white">
                PKR {product.customerPrice.toFixed(2)}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          No featured products available
        </div>
      )}
    </div>
  )
}