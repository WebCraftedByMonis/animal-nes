'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpDown, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import Image from 'next/image'

interface JobFormImage {
  id: string
  url: string
  alt: string
  publicId: string
}

interface JobForm {
  id: string
  name: string
  company: string
  mobileNumber: string
  email?: string
  position: string
  eligibility: string
  benefits: string
  location: string
  deadline: string
  noofpositions: string
  companyAddress: string
  howToApply: string
  jobFormImage?: JobFormImage
  createdAt: string
}

export default function JobFormsPage() {
  const [jobForms, setJobForms] = useState<JobForm[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchJobForms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      const res = await fetch(`/api/vacancyForm?${params.toString()}`)
      const data = await res.json()

      setJobForms(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error(error)
      toast.error('Failed to fetch job forms')
    } finally {
      setLoading(false)
    }
  }, [search, page, limit])

  useEffect(() => {
    fetchJobForms()
  }, [fetchJobForms])

  const totalPages = Math.ceil(total / limit)

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-green-500">Job Listings</h1>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              className="focus:ring-green-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <TableHeader className="bg-gray-100 dark:bg-zinc-800">
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Posted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                  </TableCell>
                </TableRow>
              ) : jobForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No job listings found.
                  </TableCell>
                </TableRow>
              ) : (
                jobForms.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-semibold">{job.position}</div>
                      <div className="text-sm text-gray-500">by {job.name}</div>
                    </TableCell>
                    <TableCell>
                      {job.company}
                      <div className="text-xs text-gray-400">{job.location}</div>
                    </TableCell>
                    <TableCell>
                      {job.mobileNumber}
                      {job.email && <div className="text-xs">{job.email}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{job.eligibility}</TableCell>
                    <TableCell className="text-sm">{job.deadline}</TableCell>
                    <TableCell>
                      {job.jobFormImage?.url && (
                        <Image
                          src={job.jobFormImage.url}
                          alt={job.jobFormImage.alt}
                          width={50}
                          height={50}
                          className="rounded"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 px-4 py-2 flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total entries: {total}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Prev
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? 'default' : 'outline'}
                    className={p === page ? 'bg-green-500 text-white' : ''}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Suspense>
  )
}
