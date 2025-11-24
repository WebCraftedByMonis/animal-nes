'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Mail, Phone, MapPin, Package, Calendar, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Product {
  id: number
  productName: string
  genericName: string | null
  category: string
  subCategory: string
  productType: string
  slug: string
  image: {
    url: string
    alt: string
  } | null
  variants: {
    packingVolume: string
    customerPrice: number
  }[]
  partner: {
    partnerName: string
  }
}

interface Company {
  id: number
  companyName: string
  mobileNumber: string | null
  address: string | null
  email: string | null
  image: { url: string; alt: string; publicId: string | null } | null
  products: Product[]
  createdAt: string
}

const formatWhatsAppNumber = (number: string) => {
  if (number.startsWith('03')) {
    return '+92' + number.slice(1);
  }
  return number.startsWith('+') ? number : '+' + number;
};

export default function CompanyDetailClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchCompany = async () => {
      try {
        const numericId = parseInt(id)
        if (isNaN(numericId)) return
        const { data } = await axios.get(`/api/company/${numericId}`)
        setCompany(data)
      } catch (error) {
        console.error('Error fetching company details', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [id])

  const navigateToProduct = (product: Product) => {
    const path = product.slug ? `/products/${product.slug}` : `/products/${product.id}`
    router.push(path)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="w-full h-[300px] rounded-xl" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="max-w-7xl mx-auto p-10 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 inline-block">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Company not found</h2>
          <p className="text-red-500 dark:text-red-400">
            The company you're looking for doesn't exist or may have been removed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Company Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Company Logo/Image */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg overflow-hidden">
            <div className="relative w-full h-[300px] bg-gray-100 dark:bg-zinc-800">
              {company.image?.url ? (
                <Image
                  src={company.image.url}
                  alt={company.image.alt || company.companyName}
                  fill
                  className="object-contain p-8"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  <Building2 className="w-24 h-24" />
                </div>
              )}
            </div>
          </div>

          {/* Company Details */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Company Information</h2>
            
            <div className="space-y-3">
              {company.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <a 
                      href={`mailto:${company.email}`} 
                      className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                    >
                      {company.email}
                    </a>
                  </div>
                </div>
              )}
              
              {company.mobileNumber && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(company.mobileNumber).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                    >
                      {company.mobileNumber}
                    </a>
                  </div>
                </div>
              )}
              
              {company.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                    <p className="text-gray-700 dark:text-gray-200">{company.address}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Partner Since</p>
                  <p className="text-gray-700 dark:text-gray-200">
                    {formatDistanceToNow(new Date(company.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Products</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{company.products.length}</p>
              </div>
              <Package className="w-12 h-12 text-green-600 dark:text-green-500" />
            </div>
          </div>
        </div>

        {/* Right Column - Products */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{company.companyName}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Explore our complete range of {company.products.length} products from {company.companyName}
            </p>
          </div>

          {company.products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.products.map((product) => (
                <Card 
                  key={product.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => navigateToProduct(product)}
                >
                  <CardContent className="p-0">
                    <div className="flex gap-4">
                      {product.image && (
                        <div className="relative w-32 h-32 bg-gray-100 dark:bg-zinc-800 flex-shrink-0">
                          <Image
                            src={product.image.url}
                            alt={product.image.alt || product.productName}
                            fill
                            className="object-cover"
                            sizes="128px"
                          />
                        </div>
                      )}
                      <div className="flex-1 p-4 space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                          {product.productName}
                        </h3>
                        {product.genericName && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                            {product.genericName}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {product.variants.slice(0, 2).map((variant, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {variant.packingVolume}
                            </Badge>
                          ))}
                          {product.variants.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.variants.length - 2} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-sm text-green-600 dark:text-green-500 font-medium">
                            PKR {product.variants[0]?.customerPrice || 0}
                          </p>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No products available from this company yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}