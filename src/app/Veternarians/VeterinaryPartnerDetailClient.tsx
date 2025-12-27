'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  User2, Mail, Phone, MapPin, Package, Calendar,
  Stethoscope, GraduationCap, Award, Droplet, Clock,
  Building2, ExternalLink, Star
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { useLoginModal } from '@/contexts/LoginModalContext'

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

interface VetReview {
  id: number
  rating: number
  comment: string
  createdAt: string
  user: {
    name: string | null
    image: string | null
  }
}

export default function VeterinaryPartnerDetailClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const { openModal } = useLoginModal()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<VetReview[]>([])
  const [averageRating, setAverageRating] = useState<number>(0)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

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

  useEffect(() => {
    if (!id) return

    const fetchReviews = async () => {
      try {
        const numericId = parseInt(id)
        if (isNaN(numericId)) return
        const { data } = await axios.get(`/api/vet-reviews?partnerId=${numericId}&limit=all`)
        setReviews(data.data || [])
        setAverageRating(data.averageRating || 0)
      } catch (error) {
        console.error('Error fetching reviews', error)
      } finally {
        setReviewsLoading(false)
      }
    }

    fetchReviews()
  }, [id])

  const handleSubmitReview = async () => {
    if (!session) {
      openModal('button')
      return
    }

    if (!newReview.comment.trim()) {
      toast.error('Please write a comment')
      return
    }

    setSubmittingReview(true)
    try {
      const numericId = parseInt(id)
      await axios.post('/api/vet-reviews', {
        partnerId: numericId,
        rating: newReview.rating,
        comment: newReview.comment
      })
      toast.success('Review submitted successfully!')
      setNewReview({ rating: 5, comment: '' })
      // Refresh reviews
      const { data } = await axios.get(`/api/vet-reviews?partnerId=${numericId}&limit=all`)
      setReviews(data.data || [])
      setAverageRating(data.averageRating || 0)
    } catch (error: any) {
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error('Failed to submit review')
      }
    } finally {
      setSubmittingReview(false)
    }
  }

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
            The veterinary partner you're looking for doesn't exist or may have been removed.
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
            {partner.partnerImage?.url ? (
              <Image
                src={partner.partnerImage.url}
                alt={partner.partnerName}
                width={400}
                height={400}
                className="w-full h-auto object-contain"
                priority
              />
            ) : (
              <div className="bg-gray-100 dark:bg-zinc-800 aspect-square flex items-center justify-center">
                <User2 className="w-24 h-24 text-gray-400 dark:text-gray-500" />
              </div>
            )}
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
        </div>

        {/* Right Column - Professional Details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{partner.partnerName}</h1>
            <div className="flex items-center gap-2 mt-2">
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
              <Badge variant="secondary">
                <Calendar className="w-3 h-3 mr-1" />
                Partner since {formatDistanceToNow(new Date(partner.createdAt), { addSuffix: true })}
              </Badge>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-green-600 dark:text-green-500" />
              Professional Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partner.qualificationDegree && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <GraduationCap className="w-4 h-4" />
                    Qualification
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{partner.qualificationDegree}</p>
                </div>
              )}

              {partner.specialization && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Award className="w-4 h-4" />
                    Specialization
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{partner.specialization}</p>
                </div>
              )}

              {partner.rvmpNumber && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Award className="w-4 h-4" />
                    RVMP Number
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{partner.rvmpNumber}</p>
                </div>
              )}

              {partner.species && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Stethoscope className="w-4 h-4" />
                    Species Expertise
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{partner.species}</p>
                </div>
              )}
            </div>
          </div>

          {/* Associated Products */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600 dark:text-green-500" />
              Recommended Products ({partner.products.length})
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
                <p className="text-gray-600 dark:text-gray-400">No products associated with this partner yet.</p>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Patient Reviews
              </h2>
              {!reviewsLoading && reviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(averageRating)
                            ? 'fill-yellow-400 stroke-yellow-400'
                            : 'fill-none stroke-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {averageRating.toFixed(1)} / 5.0
                  </span>
                  <span className="text-sm text-gray-500">({reviews.length} reviews)</span>
                </div>
              )}
            </div>

            {/* Write a Review Form */}
            <Card className="mb-6 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Share Your Experience
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 cursor-pointer ${
                              star <= newReview.rating
                                ? 'fill-yellow-400 stroke-yellow-400'
                                : 'fill-none stroke-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Your Review
                    </label>
                    <Textarea
                      placeholder="Share your experience with this veterinarian..."
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      rows={4}
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submittingReview || !newReview.comment.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                  {!session && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Please <button onClick={() => openModal('button')} className="text-green-600 hover:underline">login</button> to leave a review
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            {reviewsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="border border-gray-200 dark:border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {review.user.image ? (
                            <Image
                              src={review.user.image}
                              alt={review.user.name || 'User'}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                              <User2 className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {review.user.name || 'Anonymous'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'fill-yellow-400 stroke-yellow-400'
                                      : 'fill-none stroke-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {review.comment}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-12 text-center">
                <Star className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No reviews yet. Be the first to review!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}