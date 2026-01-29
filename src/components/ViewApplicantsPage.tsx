'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Loader2, FileDown } from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import EditApplicantModal from './EditApplicantModal'
import WhatsAppLink from '@/components/WhatsAppLink'

interface Applicant {
  id: number
  name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  mobileNumber: string
  address: string
  qualification?: string
  dateOfBirth: string
  expectedPosition?: string
  expectedSalary?: string
  preferredIndustry?: string
  preferredLocation?: string
  highestDegree?: string
  degreeInstitution?: string
  majorFieldOfStudy?: string
  workExperience?: string
  previousCompany?: string
  declaration: 'AGREED' | 'NOT_AGREED'
  image?: { url: string; alt: string } | null
  cv?: { url: string; alt: string } | null
}

export default function ViewApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null)

  const fetchApplicants = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/jobApplicant', {
        params: { search, page, limit },
      })
      setApplicants(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error(error)
      toast.error('Failed to fetch applicants')
    }
  }, [search, page, limit])

  useEffect(() => { fetchApplicants() }, [fetchApplicants])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this applicant?')) return
    setIsDeleting(id)
    try {
      await axios.delete('/api/jobApplicant', { params: { id } })
      toast.success('Applicant deleted')
      fetchApplicants()
    } catch {
      toast.error('Failed to delete applicant')
    } finally {
      setIsDeleting(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const getPaginationNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    pages.push(1)
    if (page > 3) pages.push('...')
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) {
      pages.push(p)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-green-600">Job Applicants</h1>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input placeholder="Search applicants..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <span>Show</span>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Expected Position</TableHead>
                <TableHead>Expected Salary</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Degree</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Declaration</TableHead>
                <TableHead>CV</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicants.map((app, idx) => (
                <TableRow key={app.id}>
                  <TableCell>{(page - 1) * limit + idx + 1}</TableCell>
                  <TableCell>
                    {app.image && (
                      <Image src={app.image.url} alt={app.image.alt} width={40} height={40} className="rounded" />
                    )}
                  </TableCell>
                  <TableCell>{app.name}</TableCell>
                  <TableCell>{app.gender}</TableCell>
                  <TableCell><WhatsAppLink phone={app.mobileNumber || ''} /></TableCell>
                  <TableCell>{app.address}</TableCell>
                  <TableCell>{new Date(app.dateOfBirth).toLocaleDateString()}</TableCell>
                  <TableCell>{app.qualification || '-'}</TableCell>
                  <TableCell>{app.expectedPosition || '-'}</TableCell>
                  <TableCell>{app.expectedSalary || '-'}</TableCell>
                  <TableCell>{app.preferredIndustry || '-'}</TableCell>
                  <TableCell>{app.preferredLocation || '-'}</TableCell>
                  <TableCell>{app.highestDegree || '-'}</TableCell>
                  <TableCell>{app.degreeInstitution || '-'}</TableCell>
                  <TableCell>{app.majorFieldOfStudy || '-'}</TableCell>
                  <TableCell>{app.workExperience || '-'}</TableCell>
                  <TableCell>{app.previousCompany || '-'}</TableCell>
                  <TableCell>{app.declaration}</TableCell>
                  <TableCell>
                    {app.cv ? (
                      <a href={app.cv.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <FileDown className="w-4 h-4" /> View CV
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingApplicant(app)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(app.id)}
                      disabled={isDeleting === app.id}
                    >
                      {isDeleting === app.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 px-4 py-2 flex justify-between items-center text-sm">
            <p>Total entries: {total}</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
              {getPaginationNumbers().map((p, i) =>
                typeof p === 'string' ? (
                  <span key={i} className="px-2">…</span>
                ) : (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? 'default' : 'outline'}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </div>

        {editingApplicant && (
          <EditApplicantModal
            applicant={editingApplicant}
            onClose={() => setEditingApplicant(null)}
            onUpdated={fetchApplicants}
          />
        )}
      </div>
    </Suspense>
  )
}
