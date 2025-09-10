// app/job-posts/[id]/JobPostDetailClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft, 
  Briefcase, 
  Calendar, 
  Clock, 
  Share2, 
  Bookmark,
  Mail,
  Phone,
  MapPin,
  Building2
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-toastify'

interface TraditionalJobPost {
  id: number
  title: string
  description: string
  image: { url: string; alt: string; publicId: string | null } | null
  createdAt: string
  updatedAt: string
}

interface JobPostDetailClientProps {
  traditionalJobPost: TraditionalJobPost | null
}

export default function JobPostDetailClient({ traditionalJobPost }: JobPostDetailClientProps) {
  const router = useRouter()
  const [jobPost] = useState<TraditionalJobPost | null>(traditionalJobPost)
  const [loading] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: jobPost?.title,
          text: `Check out this job opportunity: ${jobPost?.title}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const handleApply = () => {
    // You can implement your application logic here
    // For now, just show a toast
    toast.info('Application feature coming soon!')
  }

  if (loading) {
    return <JobPostDetailSkeleton />
  }

  if (!jobPost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Briefcase className="h-20 w-20 text-gray-300 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-600">Job Post Not Found</h2>
          <Button onClick={() => router.push('/traditionaljobposts')}>
            View All Jobs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Company Logo/Image */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800">
                      {jobPost.image && !imageError ? (
                        <Image
                          src={jobPost.image.url}
                          alt={jobPost.image.alt || jobPost.title}
                          width={600}
                          height={600}
                          className="w-full h-auto object-contain"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Briefcase className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Job Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {jobPost.title}
                      </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Posted {format(new Date(jobPost.createdAt), 'MMMM d, yyyy')}</span>
                      </div>
                      {jobPost.updatedAt !== jobPost.createdAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Updated {format(new Date(jobPost.updatedAt), 'MMMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Open Position
                      </Badge>
                      <Badge variant="outline">
                        Full Time
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Job Description</h2>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {jobPost.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <Button 
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  size="lg"
                  onClick={handleApply}
                >
                  Apply Now
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => toast.info('Save feature coming soon!')}
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Job Details Card */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Job Details</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Job Type</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Full Time</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">On-site / Remote</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Posted Date</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(jobPost.createdAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Info Card (placeholder) */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">About the Company</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <span className="text-sm">Animal Wellness</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Leading platform for animal care, veterinary services, and pet industry careers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function JobPostDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="bg-white dark:bg-zinc-900 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <Skeleton className="w-24 h-24 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}