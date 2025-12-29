import { Metadata } from 'next'
import { Suspense } from 'react'
import FormsClient from '@/components/FormsClient'
import { Skeleton } from '@/components/ui/skeleton'

// Use ISR with hourly revalidation for better SEO
export const revalidate = 3600 // Revalidate every hour

export const metadata: Metadata = {
  title: 'Forms & Applications - Animal Wellness Services',
  description: 'Explore our collection of forms and applications for various veterinary services, registrations, and animal care programs. Easy online form submission with secure processing.',
  keywords: [
    'veterinary forms', 'animal registration forms', 'pet care applications', 'veterinary services forms',
    'animal wellness forms', 'pet registration', 'veterinary applications', 'animal care forms',
    'online veterinary forms', 'pet care registration', 'animal health forms'
  ],
  openGraph: {
    title: 'Forms & Applications - Animal Wellness Services',
    description: 'Explore our collection of forms and applications for various veterinary services, registrations, and animal care programs.',
    type: 'website',
    images: ['/forms-og.jpg'],
  },
  alternates: {
    canonical: '/forms',
  },
}

function FormsPageSkeleton() {
  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <Skeleton className="h-10 w-64 mx-auto" />
      <Skeleton className="h-6 w-96 mx-auto" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Skeleton */}
        <div className="w-full lg:w-64 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* Forms Grid Skeleton */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-[300px] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FormsPage() {
  return (
    <Suspense fallback={<FormsPageSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-green-600">
            Forms & Applications
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse and submit forms for various veterinary services, registrations, and animal care programs
          </p>
        </div>
        <FormsClient />
      </div>
    </Suspense>
  )
}
