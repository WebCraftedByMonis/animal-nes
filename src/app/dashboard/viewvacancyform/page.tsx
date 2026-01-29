'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpDown, Loader2, Pencil, Trash2, Eye } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import Image from 'next/image'
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import WhatsAppLink from '@/components/WhatsAppLink'

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
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // Edit states
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editMobileNumber, setEditMobileNumber] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [editEligibility, setEditEligibility] = useState('')
  const [editBenefits, setEditBenefits] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editNoOfPositions, setEditNoOfPositions] = useState('')
  const [editCompanyAddress, setEditCompanyAddress] = useState('')
  const [editHowToApply, setEditHowToApply] = useState('')
  const [editImage, setEditImage] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobForm | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job listing?')) return
    
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/vacancyForm?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      
      toast.success('Job deleted successfully')
      fetchJobForms()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete job listing')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleUpdate = async () => {
    if (!editId) return
    setIsUpdating(true)

    const formData = new FormData()
    formData.append('id', editId)
    formData.append('name', editName)
    formData.append('company', editCompany)
    formData.append('mobileNumber', editMobileNumber)
    formData.append('email', editEmail)
    formData.append('position', editPosition)
    formData.append('eligibility', editEligibility)
    formData.append('benefits', editBenefits)
    formData.append('location', editLocation)
    formData.append('deadline', editDeadline)
    formData.append('noofpositions', editNoOfPositions)
    formData.append('companyAddress', editCompanyAddress)
    formData.append('howToApply', editHowToApply)
    if (editImage) formData.append('image', editImage)

    try {
      const response = await fetch('/api/vacancyForm', { 
        method: 'PUT', 
        body: formData 
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update')
      }
      
      toast.success('Job updated successfully')
      setOpen(false)
      resetEditForm()
      fetchJobForms()
    } catch (error) {
      console.error('Update error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update job'
      toast.error(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const resetEditForm = () => {
    setEditId(null)
    setEditName('')
    setEditCompany('')
    setEditMobileNumber('')
    setEditEmail('')
    setEditPosition('')
    setEditEligibility('')
    setEditBenefits('')
    setEditLocation('')
    setEditDeadline('')
    setEditNoOfPositions('')
    setEditCompanyAddress('')
    setEditHowToApply('')
    setEditImage(null)
    setEditImagePreview(null)
  }

  const openEditDialog = (job: JobForm) => {
    setEditId(job.id)
    setEditName(job.name)
    setEditCompany(job.company)
    setEditMobileNumber(job.mobileNumber)
    setEditEmail(job.email || '')
    setEditPosition(job.position)
    setEditEligibility(job.eligibility)
    setEditBenefits(job.benefits)
    setEditLocation(job.location)
    setEditDeadline(job.deadline)
    setEditNoOfPositions(job.noofpositions)
    setEditCompanyAddress(job.companyAddress)
    setEditHowToApply(job.howToApply)
    setEditImagePreview(job.jobFormImage?.url || null)
    setOpen(true)
  }

  const openViewDialog = (job: JobForm) => {
    setSelectedJob(job)
    setViewDialogOpen(true)
  }

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
      console.error('Fetch error:', error)
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
      <div className="p-6 space-y-6 w-full mx-auto">
        <h1 className="text-3xl font-bold text-center text-green-600">Job Listings Management</h1>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by position, company, location..."
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              className="w-80 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">entries</span>
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <TableHeader className="bg-gray-50 dark:bg-zinc-800">
              <TableRow>
                <TableHead className="font-semibold">Position</TableHead>
                <TableHead className="font-semibold">Company Details</TableHead>
                <TableHead className="font-semibold">Contact Info</TableHead>
                <TableHead className="font-semibold">Requirements</TableHead>
                <TableHead className="font-semibold">Positions</TableHead>
                <TableHead className="font-semibold">Deadline</TableHead>
                <TableHead className="font-semibold">Posted</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-500" />
                  </TableCell>
                </TableRow>
              ) : jobForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No job listings found.
                  </TableCell>
                </TableRow>
              ) : (
                jobForms.map((job) => (
                  <TableRow key={job.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                    <TableCell>
                      <div className="font-semibold text-gray-900 dark:text-white">{job.position}</div>
                      <div className="text-sm text-gray-500">Posted by: {job.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{job.company}</div>
                      <div className="text-sm text-gray-500">{job.location}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm"><WhatsAppLink phone={job.mobileNumber || ''} /></div>
                      {job.email && <div className="text-xs text-gray-500">{job.email}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm line-clamp-2">{job.eligibility}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{job.noofpositions}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{job.deadline}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openViewDialog(job)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(job)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isDeleting === job.id}
                          onClick={() => handleDelete(job.id)}
                          title="Delete"
                        >
                          {isDeleting === job.id ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t">
              <span className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  First
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = page > 3 ? page - 2 + i : i + 1
                  if (pageNum > totalPages) return null
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={pageNum === page ? 'default' : 'outline'}
                      className={pageNum === page ? 'bg-green-500 hover:bg-green-600' : ''}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                }).filter(Boolean)}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetEditForm()
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Job Listing</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <Input 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company *</label>
                <Input 
                  value={editCompany} 
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number *</label>
                <Input 
                  value={editMobileNumber} 
                  onChange={(e) => setEditMobileNumber(e.target.value)}
                  placeholder="Contact number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input 
                  type="email"
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email address (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Position *</label>
                <Input 
                  value={editPosition} 
                  onChange={(e) => setEditPosition(e.target.value)}
                  placeholder="Job position"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location *</label>
                <Input 
                  value={editLocation} 
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Job location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of Positions *</label>
                <Input 
                  value={editNoOfPositions} 
                  onChange={(e) => setEditNoOfPositions(e.target.value)}
                  placeholder="Number of openings"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deadline *</label>
                <Input 
                  value={editDeadline} 
                  onChange={(e) => setEditDeadline(e.target.value)}
                  placeholder="Application deadline"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Eligibility *</label>
                <Textarea 
                  value={editEligibility} 
                  onChange={(e) => setEditEligibility(e.target.value)}
                  placeholder="Eligibility requirements"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Benefits *</label>
                <Textarea 
                  value={editBenefits} 
                  onChange={(e) => setEditBenefits(e.target.value)}
                  placeholder="Job benefits"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Company Address *</label>
                <Textarea 
                  value={editCompanyAddress} 
                  onChange={(e) => setEditCompanyAddress(e.target.value)}
                  placeholder="Complete company address"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">How to Apply *</label>
                <Textarea 
                  value={editHowToApply} 
                  onChange={(e) => setEditHowToApply(e.target.value)}
                  placeholder="Application instructions"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Company Logo/Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setEditImage(file)
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setEditImagePreview(reader.result as string)
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                {editImagePreview && (
                  <div className="mt-2">
                    <Image 
                      src={editImagePreview} 
                      alt="Preview" 
                      width={200} 
                      height={200} 
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)} 
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Job Listing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>
          
          {selectedJob && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                {selectedJob.jobFormImage?.url && (
                  <div className="flex justify-center mb-4">
                    <Image
                      src={selectedJob.jobFormImage.url}
                      alt={selectedJob.jobFormImage.alt}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Contact Person</h3>
                    <p className="mt-1">{selectedJob.name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Company</h3>
                    <p className="mt-1">{selectedJob.company}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Contact Number</h3>
                    <div className="mt-1"><WhatsAppLink phone={selectedJob.mobileNumber || ''} /></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Email</h3>
                    <p className="mt-1">{selectedJob.email || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Position</h3>
                    <p className="mt-1">{selectedJob.position}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Location</h3>
                    <p className="mt-1">{selectedJob.location}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Number of Positions</h3>
                    <p className="mt-1">{selectedJob.noofpositions}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Deadline</h3>
                    <p className="mt-1">{selectedJob.deadline}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm text-gray-600">Company Address</h3>
                  <p className="mt-1 whitespace-pre-wrap">{selectedJob.companyAddress}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm text-gray-600">Eligibility</h3>
                  <p className="mt-1 whitespace-pre-wrap">{selectedJob.eligibility}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm text-gray-600">Benefits</h3>
                  <p className="mt-1 whitespace-pre-wrap">{selectedJob.benefits}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm text-gray-600">How to Apply</h3>
                  <p className="mt-1 whitespace-pre-wrap">{selectedJob.howToApply}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm text-gray-600">Posted</h3>
                  <p className="mt-1">
                    {formatDistanceToNow(new Date(selectedJob.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Suspense>
  )
}