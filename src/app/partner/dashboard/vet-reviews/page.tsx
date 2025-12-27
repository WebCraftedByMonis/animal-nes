'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, User, Star } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface VetReview {
  id: number
  rating: number
  comment: string
  isApproved: boolean
  userId: string
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  createdAt: string
  updatedAt: string
}

export default function PartnerVetReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<VetReview[]>([])
  const [averageRating, setAverageRating] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/partner/vet-reviews', {
        params: {
          page,
          limit,
        },
      })
      setReviews(data.data)
      setTotal(data.pagination.total)
      setHasMore(data.pagination.hasMore)
      setAverageRating(data.averageRating || 0)
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Please login to access this page')
        router.push('/partner/login')
      } else {
        toast.error('Failed to fetch reviews')
      }
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, router])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-green-500 stroke-green-500'
                : 'fill-none stroke-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-green-500">Patient Reviews</h1>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-500">Patient Reviews</h1>
        <div className="flex gap-4 items-center">
          <div className="text-sm text-gray-600">
            Average Rating: {averageRating.toFixed(1)} / 5.0 ⭐
          </div>
          <div className="text-sm text-gray-600">
            Total: {total} reviews
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 items-center">
          <span>Show</span>
          <Select value={String(limit)} onValueChange={(v) => {
            setLimit(Number(v))
            setPage(1)
          }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>entries</span>
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
        <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
          <TableHeader className="bg-gray-100 dark:bg-zinc-800">
            <TableRow>
              <TableHead className="px-4 py-2">S.No</TableHead>
              <TableHead className="px-4 py-2">Patient</TableHead>
              <TableHead className="px-4 py-2">Name</TableHead>
              <TableHead className="px-4 py-2">Email</TableHead>
              <TableHead className="px-4 py-2">Rating</TableHead>
              <TableHead className="px-4 py-2 max-w-md">Comment</TableHead>
              <TableHead className="px-4 py-2">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No reviews yet. Reviews from patients will appear here.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review, idx) => (
                <TableRow
                  key={review.id}
                  className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                >
                  <TableCell className="px-4 py-2">{(page - 1) * limit + idx + 1}</TableCell>
                  <TableCell className="px-4 py-2">
                    {review.user.image ? (
                      <Image
                        src={review.user.image}
                        alt={review.user.name || 'User'}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    {review.user.name || 'N/A'}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-sm">
                    {review.user.email || 'N/A'}
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    {renderStars(review.rating)}
                  </TableCell>
                  <TableCell className="px-4 py-2 max-w-md">
                    <p className="truncate text-sm" title={review.comment}>
                      {review.comment}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-2 text-sm text-gray-600">
                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && total > limit && (
          <div className="mt-4 px-4 py-2 flex justify-center items-center">
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                variant="outline"
              >
                Previous
              </Button>
              {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? 'default' : 'outline'}
                  onClick={() => setPage(p)}
                  className={p === page ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                >
                  {p}
                </Button>
              ))}
              <Button
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage(page + 1)}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
