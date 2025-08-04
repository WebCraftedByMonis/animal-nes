'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  User2, Mail, Phone, MapPin, Package, Calendar,
  Store, Clock, ExternalLink, Building2, Droplet,
  GraduationCap, Stethoscope, Award, UserCheck
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Product {
  id: number
  productName: string
  genericName: string | null
  category: string
  image: {
    url: string
    alt: string
  } | null
  variants: {
    packingVolume: string
    customerPrice: number
  }[]
  company: {
    companyName: string
  }
}

interface Partner {
  id: number
  partnerName: string
  gender?: string
  partnerEmail?: string
  partnerMobileNumber?: string
  cityName?: string
  state?: string
  fullAddress?: string
  shopName?: string
  qualificationDegree?: string
  rvmpNumber?: string
  specialization?: string
  species?: string
  partnerType?: string
  bloodGroup?: string
  zipcode?: string
  areaTown?: string
  availableDaysOfWeek: { day: string }[]
  startTime?: { time: string }[]
  partnerImage: { url: string; publicId: string } | null
  products: Product[]
  createdAt: string
}
const formatWhatsAppNumber = (number: string) => {
  if (number.startsWith('03')) {
    return '+92' + number.slice(1);
  }
  return number.startsWith('+') ? number : '+' + number;
};

export default function SalesPartnerDetailClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchPartner = async () => {
      try {
        const numericId = parseInt(id)
        if (isNaN(numericId)) return
        const { data } = await axios.get(`/api/partner/${numericId}`)
        setPartner(data)
      } catch (error) {
        console.error('Error fetching partner details', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPartner()
  }, [id])

  const navigateToProduct = (product: Product) => {
    router.push(`/products/${product.id}`)
  }

  const getGenderBadgeColor = (gender?: string) => {
    switch (gender?.toUpperCase()) {
      case 'MALE': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
      case 'FEMALE': return 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200'
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
    }
  }

  const getBloodGroupBadge = (bloodGroup?: string) => {
    if (!bloodGroup) return null
    return bloodGroup.replace('_', ' ').replace('POSITIVE', '+').replace('NEGATIVE', '-')
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="w-full h-[400px] rounded-xl" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="max-w-7xl mx-auto p-10 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 inline-block">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Partner not found</h2>
          <p className="text-red-500 dark:text-red-400">
            The sales partner you're looking for doesn't exist or may have been removed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Partner Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Partner Photo */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg overflow-hidden">
            <div className="relative w-full h-[400px] bg-gray-100 dark:bg-zinc-800">
              {partner.partnerImage?.url ? (
                <Image
                  src={partner.partnerImage.url}
                  alt={partner.partnerName}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  <User2 className="w-24 h-24" />
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contact Information</h2>

            <div className="space-y-3">
              {partner.partnerEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <a
                      href={`mailto:${partner.partnerEmail}`}
                      className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                    >
                      {partner.partnerEmail}
                    </a>
                  </div>
                </div>
              )}

              {partner.partnerMobileNumber && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(partner.partnerMobileNumber).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                    >
                      {partner.partnerMobileNumber}
                    </a>
                  </div>
                </div>
              )}

              {partner.fullAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                    <p className="text-gray-700 dark:text-gray-200 break-words">
                      {(() => {
                        const urlRegex = /(https?:\/\/[^\s]+)/g
                        const parts = partner.fullAddress.split(urlRegex)

                        return parts.map((part, idx) =>
                          urlRegex.test(part) ? (
                            <a
                              key={idx}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 dark:text-green-500 underline hover:text-green-800"
                            >
                              {part}
                            </a>
                          ) : (
                            <span key={idx}>{part}</span>
                          )
                        )
                      })()}
                      {partner.areaTown && <><br />{partner.areaTown}</>}
                      {partner.cityName && <><br />{partner.cityName}</>}
                      {partner.state && `, ${partner.state}`}
                      {partner.zipcode && ` ${partner.zipcode}`}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Professional Info */}
          {(partner.qualificationDegree || partner.rvmpNumber || partner.specialization || partner.species) && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Professional Information</h2>

              <div className="space-y-3">
                {partner.qualificationDegree && (
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Qualification</p>
                      <p className="text-gray-700 dark:text-gray-200">{partner.qualificationDegree}</p>
                    </div>
                  </div>
                )}

                {partner.rvmpNumber && (
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">RVMP Number</p>
                      <p className="text-gray-700 dark:text-gray-200">{partner.rvmpNumber}</p>
                    </div>
                  </div>
                )}

                {partner.specialization && (
                  <div className="flex items-start gap-3">
                    <Stethoscope className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Specialization</p>
                      <p className="text-gray-700 dark:text-gray-200">{partner.specialization}</p>
                    </div>
                  </div>
                )}

                {partner.species && (
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Species</p>
                      <p className="text-gray-700 dark:text-gray-200">{partner.species}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business Hours */}
          {partner.availableDaysOfWeek.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-500" />
                Business Hours
              </h2>

              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Open Days</p>
                <div className="flex flex-wrap gap-2">
                  {partner.availableDaysOfWeek.map((dayObj) => (
                    <Badge key={dayObj.day} variant="outline" className="text-green-600 border-green-600">
                      {dayObj.day}
                    </Badge>
                  ))}
                </div>

                {partner.startTime && partner.startTime.length > 0 && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Operating Hours</p>
                    <div className="flex flex-wrap gap-2">
                      {partner.startTime.map((timeObj, idx) => (
                        <Badge key={idx} variant="secondary">
                          {timeObj.time}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Stats Card */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Products Available</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{partner.products.length}</p>
              </div>
              <Package className="w-12 h-12 text-green-600 dark:text-green-500" />
            </div>
          </div>
        </div>

        {/* Right Column - Business Details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{partner.partnerName}</h1>
            {partner.shopName && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                <Store className="w-5 h-5" />
                {partner.shopName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {partner.gender && (
                <Badge className={getGenderBadgeColor(partner.gender)}>
                  {partner.gender}
                </Badge>
              )}
              {partner.bloodGroup && (
                <Badge variant="outline">
                  <Droplet className="w-3 h-3 mr-1" />
                  {getBloodGroupBadge(partner.bloodGroup)}
                </Badge>
              )}
              {partner.partnerType && (
                <Badge variant="secondary">
                  <Building2 className="w-3 h-3 mr-1" />
                  {partner.partnerType}
                </Badge>
              )}
              <Badge variant="secondary">
                <Calendar className="w-3 h-3 mr-1" />
                Partner since {formatDistanceToNow(new Date(partner.createdAt), { addSuffix: true })}
              </Badge>
            </div>
          </div>

          {/* Products Catalog */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600 dark:text-green-500" />
              Available Products ({partner.products.length})
            </h2>

            {partner.products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partner.products.map((product) => (
                  <Card
                    key={product.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
                    onClick={() => navigateToProduct(product)}
                  >
                    <CardContent className="p-0">
                      <div className="flex gap-4">
                        {product.image ? (
                          <div className="relative w-32 h-32 bg-gray-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden">
                            <Image
                              src={product.image.url}
                              alt={product.image.alt || product.productName}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="128px"
                            />
                          </div>
                        ) : (
                          <div className="relative w-32 h-32 bg-gray-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 p-4 space-y-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
                            {product.productName}
                          </h3>
                          {product.genericName && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              {product.genericName}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <p>{product.category}</p>
                            {product.company && (
                              <p className="italic">by {product.company.companyName}</p>
                            )}
                          </div>
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
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors" />
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
                <p className="text-gray-600 dark:text-gray-400">No products available at this location yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}