import { Metadata } from 'next'
import { Suspense } from 'react'
import VeterinaryAssistantsClient from './VeterinaryAssistantsClient'
import { Skeleton } from '@/components/ui/skeleton'

// Make this page dynamic - no ISR caching
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Veterinary Assistants',
  description: 'Find experienced veterinary assistants specialized in extension services, deworming, vaccination, and artificial insemination.',
  keywords: ['veterinary assistants', 'extension services', 'deworming', 'vaccination', 'artificial insemination', 'animal care'],
}

function VeterinaryAssistantsPageSkeleton() {
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

export default function VeterinaryAssistantsPage() {
  return (
    <Suspense fallback={<VeterinaryAssistantsPageSkeleton />}>
      <VeterinaryAssistantsClient />
    </Suspense>
  )
}