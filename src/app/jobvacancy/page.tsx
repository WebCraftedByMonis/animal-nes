'use client'

import JobFormUpload from '@/components/JobFormUpload'
import { useEffect, useState } from 'react'

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
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const limit = 5

  useEffect(() => {
    async function fetchJobForms() {
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
      } catch (err) {
        console.error('Failed to fetch job forms:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchJobForms()
  }, [search, page])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">Job Listings</h1>

      <input
        type="text"
        placeholder="Search jobs..."
        value={search}
        onChange={(e) => {
          setPage(1)
          setSearch(e.target.value)
        }}
        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      {loading ? (
        <p className="text-green-500">Loading...</p>
      ) : !jobForms ? (
        <p className="text-gray-500 dark:text-gray-400">No job forms found.</p>
      ) : (
        <div className="space-y-6">
          {jobForms.map((job) => (
            <div
              key={job.id}
              className="flex flex-col md:flex-row gap-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-900"
            >
              {job.jobFormImage?.url && (
                <img
                  src={job.jobFormImage.url}
                  alt={job.jobFormImage.alt}
                  className="w-full md:w-48 h-48 object-cover rounded"
                />
              )}

              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400"> position: {job.position}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300"> company name address{job.company} – {job.location}</p>
                <p className="text-sm mt-1">Posted by <span className="font-medium"> No of positions{job.noofpositions}</span></p>
                <p className="text-sm mt-1">Posted by <span className="font-medium">{job.name}</span></p>
                <p className="text-sm text-gray-500 mt-1">Contact: {job.mobileNumber} {job.email && `| ${job.email}`}</p>

                <div className="mt-3 space-y-1 text-sm">
                  <p><span className="font-semibold text-green-500">Eligibility:</span> {job.eligibility}</p>
                  <p><span className="font-semibold text-green-500">Benefits:</span> {job.benefits}</p>
                  <p><span className="font-semibold text-green-500">How to Apply:</span> {job.howToApply}</p>
                </div>
                <p className="text-sm mt-1">Deadline<span className="font-medium">{job.deadline}</span></p>

                <p className="text-xs text-gray-400 mt-3">
                  Posted on {new Date(job.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <JobFormUpload/>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="px-4 py-2 rounded bg-green-500 text-white disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="px-4 py-2 rounded bg-green-500 text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
