import { Metadata } from 'next'
import { Suspense } from 'react'
import SalesClient from './SalesClient'
import { Skeleton } from '@/components/ui/skeleton'

// Make this page dynamic - no ISR caching
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sales Partners',
  description: 'Connect with trusted retailers and distributors in your area. Find sales and marketing partners for animal care products.',
  keywords: ['sales partners', 'distributors', 'retailers', 'animal care', 'marketing partners'],
}

function SalesPageSkeleton() {
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

export default function SalesPartnersPage() {
  return (
    <Suspense fallback={<SalesPageSkeleton />}>
      <SalesClient initialPartners={[]} />
    </Suspense>
  )
}
