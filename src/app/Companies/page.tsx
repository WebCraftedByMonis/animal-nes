import { Metadata } from 'next'
import { Suspense } from 'react'
import CompaniesClient from './CompaniesClient'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Partner Companies',
  description: 'Explore our trusted partner companies providing quality veterinary products and animal wellness solutions',
  keywords: ['partner companies', 'veterinary companies', 'animal wellness partners', 'pharmaceutical companies'],
}

function CompaniesPageSkeleton() {
  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <Skeleton className="h-10 w-64 mx-auto" />
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

export default function AllCompaniesPage() {
  return (
    <Suspense fallback={<CompaniesPageSkeleton />}>
      <CompaniesClient initialCompanies={[]} initialTotal={0} />
    </Suspense>
  )
}