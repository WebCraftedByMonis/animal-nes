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
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, User, Star } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

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
  partner: {
    id: number
    partnerName: string
    specialization: string | null
  }
  createdAt: string
  updatedAt: string
}

export default function ViewVetReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<VetReview[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/vet-reviews', {
        params: {
          page,
          limit,
          showUnapproved: true, // Show all reviews for admin
        },
      })
      setReviews(data.data)
      setTotal(data.total)
      setAverageRating(data.averageRating)
    } catch (error: any) {
      toast.error('Failed to fetch vet reviews')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return

    setIsDeleting(id)
    try {
      await axios.delete(`/api/vet-reviews?id=${id}`)
      toast.success('Review deleted successfully')
      fetchReviews()
    } catch (error) {
      toast.error('Failed to delete review')
    } finally {
      setIsDeleting(null)
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
                : 'fill-none stroke-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getStatusBadge = (review: VetReview) => {
    if (review.isApproved) {
      return <Badge className="bg-green-500">Approved</Badge>
    }
    return <Badge className="bg-yellow-500">Pending</Badge>
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-green-500">Veterinarian Reviews</h1>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-500">Veterinarian Reviews Management</h1>
        <div className="text-sm text-gray-600">
          Total: {total} reviews
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
              <TableHead className="px-4 py-2">Patient Name</TableHead>
              <TableHead className="px-4 py-2">Veterinarian</TableHead>
              <TableHead className="px-4 py-2">Specialization</TableHead>
              <TableHead className="px-4 py-2">Rating</TableHead>
              <TableHead className="px-4 py-2 max-w-md">Comment</TableHead>
              <TableHead className="px-4 py-2">Status</TableHead>
              <TableHead className="px-4 py-2">Created</TableHead>
              <TableHead className="px-4 py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  No veterinarian reviews found.
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
                    <div>
                      <div className="font-medium">{review.user.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{review.user.email || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2 font-medium">
                    Dr. {review.partner.partnerName}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-sm text-gray-600">
                    {review.partner.specialization || 'N/A'}
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    {renderStars(review.rating)}
                  </TableCell>
                  <TableCell className="px-4 py-2 max-w-md">
                    <p className="truncate text-sm" title={review.comment}>
                      {review.comment}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    {getStatusBadge(review)}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-sm text-gray-600">
                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(review.id)}
                      disabled={isDeleting === review.id}
                      title="Delete review"
                    >
                      {isDeleting === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
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
                disabled={page >= Math.ceil(total / limit)}
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
