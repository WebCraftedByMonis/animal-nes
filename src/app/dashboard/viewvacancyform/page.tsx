'use client'

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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Job Listings</h1>

      <input
        type="text"
        placeholder="Search jobs..."
        value={search}
        onChange={(e) => {
          setPage(1)
          setSearch(e.target.value)
        }}
        className="w-full p-2 border border-gray-300 rounded"
      />

      {loading ? (
        <p>Loading...</p>
      ) : !jobForms ? (
        <p>No job forms found.</p>
      ) : (
        <div className="space-y-4">
          {jobForms.map((job) => (
            <div
              key={job.id}
              className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white"
            >
              <h2 className="text-xl font-semibold">Position :{job.position}</h2>
              <p className="text-gray-600">Company info :{job.company} – {job.location}</p>
              <p className="text-sm mt-1">Posted by: {job.name}</p>
              <p className="text-sm mt-1">No. of positions:  {job.noofpositions}</p>
              <p className="text-sm mt-1">deadline {job.deadline}</p>
              <p className="text-sm text-gray-500 mt-1">Contact: {job.mobileNumber} {job.email && `| ${job.email}`}</p>
              <p className="mt-2"><strong>Eligibility:</strong> {job.eligibility}</p>
              <p><strong>Benefits:</strong> {job.benefits}</p>
              <p><strong>How to apply:</strong> {job.howToApply}</p>
              
              {job.jobFormImage?.url && (
                <img
                  src={job.jobFormImage.url}
                  alt={job.jobFormImage.alt}
                  className="mt-3 max-h-64 rounded"
                />
              )}
              <p className="text-xs text-gray-400 mt-2">
                Posted on {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
