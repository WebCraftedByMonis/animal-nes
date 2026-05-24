'use client'

import { useState } from 'react'
import { Star, User } from 'lucide-react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import ProductReviewForm from './ProductReviewForm'

export interface SerializedReview {
  id: number
  rating: number
  comment: string
  createdAt: string
  user: { name: string | null; image: string | null }
}

export default function ProductReviewSection({
  productId,
  initialReviews,
}: {
  productId: number
  initialReviews: SerializedReview[]
}) {
  const [reviews, setReviews] = useState<SerializedReview[]>(initialReviews)

  const handleReviewSubmitted = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`)
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch {}
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  return (
    <section aria-labelledby="reviews-heading">
      <h2
        id="reviews-heading"
        className="text-2xl font-semibold text-gray-900 dark:text-white mb-6"
      >
        Customer Reviews
        {avgRating !== null && (
          <span className="ml-3 text-base font-normal text-gray-500 dark:text-gray-400">
            {avgRating.toFixed(1)}/5 &mdash;{' '}
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-4 mb-8">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {review.user.image ? (
                    <Image
                      src={review.user.image}
                      alt={review.user.name || 'Reviewer'}
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {review.user.name || 'Anonymous'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div
                    className="flex gap-1 mb-2"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'fill-green-500 stroke-green-500'
                            : 'fill-none stroke-gray-300 dark:stroke-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductReviewForm productId={productId} onReviewSubmitted={handleReviewSubmitted} />
    </section>
  )
}
