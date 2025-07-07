// components/skeletons/TableSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function TableSkeleton() {
  return (
    <div className="p-6">
      <div className="rounded-md border">
        <div className="grid grid-cols-3 gap-4 px-4 py-2 border-b">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-4 px-4 py-4 border-b">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
