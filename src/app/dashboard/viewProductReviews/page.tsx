'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Check, X, Loader2, User, Star } from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface ProductReview {
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
  product: {
    id: number
    productName: string
  }
  createdAt: string
  updatedAt: string
}

export default function ViewProductReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [editId, setEditId] = useState<number | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editIsApproved, setEditIsApproved] = useState(false)
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [isTogglingApproval, setIsTogglingApproval] = useState<number | null>(null)

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/reviews', {
        params: {
          page,
          limit,
          showAll: true,
        },
      })
      setReviews(data.data)
      setTotal(data.pagination.total)
      setHasMore(data.pagination.hasMore)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch reviews')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleUpdate = async () => {
    if (!editId) return

    setIsUpdating(true)
    try {
      await axios.put('/api/reviews', {
        id: editId,
        comment: editComment,
        isApproved: editIsApproved,
      })
      toast.success('Review updated successfully')
      setOpen(false)
      fetchReviews()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update review')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return

    setIsDeleting(id)
    try {
      await axios.delete('/api/reviews', { params: { id } })
      toast.success('Review deleted successfully')
      fetchReviews()
    } catch (error) {
      toast.error('Failed to delete review')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleToggleApproval = async (review: ProductReview) => {
    setIsTogglingApproval(review.id)
    try {
      await axios.put('/api/reviews', {
        id: review.id,
        isApproved: !review.isApproved,
      })
      toast.success(
        review.isApproved
          ? 'Review disapproved - hidden from product page'
          : 'Review approved - now visible on product page'
      )
      fetchReviews()
    } catch (error) {
      toast.error('Failed to update approval status')
    } finally {
      setIsTogglingApproval(null)
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

  const getStatusBadge = (review: ProductReview) => {
    if (review.isApproved) {
      return <Badge className="bg-green-500">Visible</Badge>
    }
    return <Badge className="bg-red-500">Hidden</Badge>
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">Product Reviews Management</h1>
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
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <TableHeader className="bg-gray-100 dark:bg-zinc-800">
                <TableRow>
                  <TableHead className="px-4 py-2">S.No</TableHead>
                  <TableHead className="px-4 py-2">User</TableHead>
                  <TableHead className="px-4 py-2">Name</TableHead>
                  <TableHead className="px-4 py-2">Email</TableHead>
                  <TableHead className="px-4 py-2">Product</TableHead>
                  <TableHead className="px-4 py-2">Rating</TableHead>
                  <TableHead className="px-4 py-2 max-w-md">Comment</TableHead>
                  <TableHead className="px-4 py-2">Status</TableHead>
                  <TableHead className="px-4 py-2">Approval</TableHead>
                  <TableHead className="px-4 py-2">Created</TableHead>
                  <TableHead className="px-4 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      No reviews found.
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
                        {review.product.productName}
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
                      <TableCell className="px-4 py-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleToggleApproval(review)}
                          disabled={isTogglingApproval === review.id}
                          className={review.isApproved ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
                        >
                          {isTogglingApproval === review.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : review.isApproved ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Visible
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Hidden
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(review.id)}
                            disabled={isDeleting === review.id}
                          >
                            {isDeleting === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Comment *</label>
                <Textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder="Review comment..."
                  rows={5}
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                onClick={handleUpdate}
                disabled={isUpdating || !editComment.trim()}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Review'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
