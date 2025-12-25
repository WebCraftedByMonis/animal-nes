'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Star, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLoginModal } from '@/contexts/LoginModalContext'

interface ProductReviewFormProps {
  productId: number
  onReviewSubmitted?: () => void
}

export default function ProductReviewForm({ productId, onReviewSubmitted }: ProductReviewFormProps) {
  const { data: session, status } = useSession()
  const { openModal } = useLoginModal()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (status === 'unauthenticated') {
      openModal('button')
      toast.error('Please sign in to submit a review')
      return
    }

    if (!rating) {
      toast.error('Please select a rating')
      return
    }

    if (!comment.trim()) {
      toast.error('Please write a comment')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating,
          comment,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Review submitted successfully!')
        setRating(0)
        setComment('')
        if (onReviewSubmitted) {
          onReviewSubmitted()
        }
      } else {
        toast.error(data.message || 'Failed to submit review')
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error('Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Write a Review</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating *
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-green-500 stroke-green-500'
                      : 'fill-none stroke-gray-300 dark:stroke-gray-600'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Review *
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            placeholder="Share your experience with this product..."
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !rating || !comment.trim()}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </button>

        {status === 'unauthenticated' && (
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            You must be signed in to submit a review.{' '}
            <button
              type="button"
              onClick={() => openModal('button')}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Sign In
            </button>
          </p>
        )}
      </form>
    </div>
  )
}
