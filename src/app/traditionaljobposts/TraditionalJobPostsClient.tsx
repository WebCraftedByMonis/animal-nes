'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Briefcase } from 'lucide-react'
import { toast } from 'react-toastify'

interface TraditionalJobPost {
  id: number
  title: string
  description: string
  image: { url: string; alt: string; publicId: string | null } | null
  createdAt: string
  updatedAt: string
}

interface TraditionalJobPostsClientProps {
  initialJobPosts: TraditionalJobPost[]
}

export default function TraditionalJobPostsClient({ initialJobPosts }: TraditionalJobPostsClientProps) {
  const [jobPosts, setJobPosts] = useState<TraditionalJobPost[]>(initialJobPosts)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'title'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(8)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialJobPosts.length)
  const router = useRouter()

  const fetchJobPosts = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/traditionaljobpost', {
        params: { 
          search, 
          sortBy, 
          sortOrder, 
          page, 
          limit
        },
      })
      setJobPosts(data.data)
      setTotal(data.total)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch job posts')
    } finally {
      setLoading(false)
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    // Only fetch when search or filters change, not on initial load
    if (search || sortBy !== 'id' || sortOrder !== 'desc' || page !== 1 || limit !== 8) {
      fetchJobPosts()
    } else {
      // Reset to initial data
      setJobPosts(initialJobPosts)
      setTotal(initialJobPosts.length)
    }
  }, [search, sortBy, sortOrder, page, limit, initialJobPosts, fetchJobPosts])

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-')
    setSortBy(sortBy as 'id' | 'title')
    setSortOrder(sortOrder as 'asc' | 'desc')
    setPage(1) // Reset to first page when sorting changes
  }

  const navigateToJobPost = (jobPost: TraditionalJobPost) => {
    router.push(`/traditionaljobposts/${jobPost.id}`)
  }

  const truncateDescription = (description: string, maxLength: number = 150) => {
    if (description.length <= maxLength) return description
    return description.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-500">Job Opportunities</h1>
        <p className="text-muted-foreground">Discover exciting career opportunities in the veterinary and animal care industry</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
          <Input
            placeholder="Search job posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:ring-green-500 max-w-md"
          />
          <Select 
            value={`${sortBy}-${sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id-desc">Newest First</SelectItem>
              <SelectItem value="id-asc">Oldest First</SelectItem>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="title-desc">Title (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <span>Show</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              {[8, 16, 32, 64].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>entries</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <JobPostCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {jobPosts.map((jobPost) => (
              <div 
                key={jobPost.id} 
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group"
                onClick={() => navigateToJobPost(jobPost)}
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 dark:from-zinc-800 dark:to-zinc-900">
                  {jobPost.image ? (
                    <Image
                      src={jobPost.image.url}
                      alt={jobPost.image.alt || jobPost.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-green-100 to-emerald-200 dark:from-zinc-800 dark:to-zinc-700">
                      <Briefcase className="h-16 w-16 text-green-600 dark:text-green-500" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 text-white">
                      Open
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-bold text-lg line-clamp-2 group-hover:text-green-600 transition-colors">
                    {jobPost.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {truncateDescription(jobPost.description)}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Posted {formatDistanceToNow(new Date(jobPost.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigateToJobPost(jobPost)
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {jobPosts.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <Briefcase className="h-20 w-20 text-gray-300 mx-auto" />
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-600">No job posts found</p>
                <p className="text-muted-foreground">Check back later for new opportunities</p>
              </div>
            </div>
          )}

          {total > limit && (
            <div className="mt-8 flex justify-center gap-2">
              <Button 
                variant="outline" 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, Math.ceil(total / limit)) }, (_, i) => {
                let pageNum
                if (Math.ceil(total / limit) <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= Math.ceil(total / limit) - 2) {
                  pageNum = Math.ceil(total / limit) - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    onClick={() => setPage(pageNum)}
                    className={pageNum === page ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function JobPostCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="pt-3 border-t">
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  )
}