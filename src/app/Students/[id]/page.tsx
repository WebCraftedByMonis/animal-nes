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
  Clock, ExternalLink, Building2, Droplet,
  GraduationCap, BookOpen, Award, Users
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

export default function StudentDetailClient() {
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
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Student not found</h2>
          <p className="text-red-500 dark:text-red-400">
            The student you're looking for doesn't exist or may have been removed.
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
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${partner.fullAddress} ${partner.cityName || ''} ${partner.state || ''} ${partner.zipcode || ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-500 transition-colors underline"
                    >
                      {partner.fullAddress}
                      {partner.cityName && <><br />{partner.cityName}</>}
                      {partner.state && `, ${partner.state}`}
                      {partner.zipcode && ` ${partner.zipcode}`}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Availability */}
          {partner.availableDaysOfWeek.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-500" />
                Availability
              </h2>

              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Available Days</p>
                <div className="flex flex-wrap gap-2">
                  {partner.availableDaysOfWeek.map((dayObj) => (
                    <Badge key={dayObj.day} variant="outline" className="text-green-600 border-green-600">
                      {dayObj.day}
                    </Badge>
                  ))}
                </div>

                {partner.startTime && partner.startTime.length > 0 && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Available Times</p>
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
        </div>

        {/* Right Column - Academic Details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{partner.partnerName}</h1>
            {partner.shopName && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
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
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                <Users className="w-3 h-3 mr-1" />
                Student
              </Badge>
              <Badge variant="secondary">
                <Calendar className="w-3 h-3 mr-1" />
                Partner since {formatDistanceToNow(new Date(partner.createdAt), { addSuffix: true })}
              </Badge>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600 dark:text-green-500" />
              Academic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partner.qualificationDegree && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <GraduationCap className="w-4 h-4" />
                    Current Studies
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{partner.qualificationDegree}</p>
                </div>
              )}

              {partner.specialization && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Award className="w-4 h-4" />
                    Field of Study
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{partner.specialization}</p>
                </div>
              )}

              {partner.rvmpNumber && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Award className="w-4 h-4" />
                    Student ID
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{partner.rvmpNumber}</p>
                </div>
              )}

              {partner.species && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <BookOpen className="w-4 h-4" />
                    Area of Interest
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{partner.species}</p>
                </div>
              )}
            </div>
          </div>

          {/* Associated Products/Resources */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600 dark:text-green-500" />
              Associated Resources ({partner.products.length})
            </h2>

            {partner.products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partner.products.map((product) => (
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
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Building2 className="w-3 h-3" />
                            {product.company?.companyName}
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
                <p className="text-gray-600 dark:text-gray-400">No resources associated with this student yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}