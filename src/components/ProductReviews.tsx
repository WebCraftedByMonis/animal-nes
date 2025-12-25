'use client'

import { useState, useEffect } from 'react'
import { Star, User } from 'lucide-react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

interface Review {
  id: number
  rating: number
  comment: string
  createdAt: string
  user: {
    name: string | null
    image: string | null
  }
}

interface ProductReviewsProps {
  productId: number
  refreshTrigger?: number
}

export default function ProductReviews({ productId, refreshTrigger = 0 }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReviews()
  }, [productId, refreshTrigger])

  const fetchReviews = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/reviews?productId=${productId}`)
      const data = await response.json()
      setReviews(data.reviews || [])
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-green-500 stroke-green-500'
                : 'fill-none stroke-gray-300 dark:stroke-gray-600'
            }`}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Customer Reviews</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Customer Reviews</h3>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No reviews yet. Be the first to review this product!
        </p>
      </div>
    )
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Reviews</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-green-500 stroke-green-500" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-200 dark:border-zinc-700 last:border-0 pb-6 last:pb-0">
            <div className="flex items-start gap-4">
              {/* User Avatar */}
              <div className="flex-shrink-0">
                {review.user.image ? (
                  <Image
                    src={review.user.image}
                    alt={review.user.name || 'User'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </div>

              {/* Review Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {review.user.name || 'Anonymous User'}
                  </h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {renderStars(review.rating)}

                <p className="mt-2 text-gray-700 dark:text-gray-300">{review.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
