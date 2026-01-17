import { Metadata } from 'next'
import { Suspense } from 'react'
import FacultyClient from './FacultyClient'
import { Skeleton } from '@/components/ui/skeleton'

// Make this page dynamic - no ISR caching
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Faculty',
  description: 'Connect with faculty members specializing in veterinary medical sciences and arts.',
  keywords: ['faculty', 'veterinary medical sciences', 'arts', 'education', 'academics'],
}

function FacultyPageSkeleton() {
  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <Skeleton className="h-10 w-96 mx-auto" />
        <Skeleton className="h-6 w-64 mx-auto" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px] rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function FacultyPage() {
  return (
    <Suspense fallback={<FacultyPageSkeleton />}>
      <FacultyClient />
    </Suspense>
  )
}
