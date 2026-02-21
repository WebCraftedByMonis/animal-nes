'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Trash2, ArrowUpDown, Loader2, Plus, FileText } from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

interface TraditionalJobPost {
  id: number
  title: string
  description: string
  name?: string | null
  whatsapp?: string | null
  email?: string | null
  image: { url: string; alt: string; publicId: string | null } | null
  createdAt: string
  updatedAt: string
}

export default function ViewTraditionalJobPostsPage() {
  const [jobPosts, setJobPosts] = useState<TraditionalJobPost[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'title'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editName, setEditName] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editJobImage, setEditJobImage] = useState<File | null>(null)
  const [editJobImagePreview, setEditJobImagePreview] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const fetchJobPosts = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/traditionaljobpost', {
        params: { search, sortBy, sortOrder, page, limit },
      })
      setJobPosts(data.data)
      setTotal(data.total)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch job posts')
    } finally {
      setIsLoading(false)
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchJobPosts()
  }, [fetchJobPosts])

  const handleUpdate = async () => {
    if (!editId) return

    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('id', editId.toString())
      formData.append('title', editTitle)
      formData.append('description', editDescription)
      if (editName) formData.append('name', editName)
      if (editWhatsapp) formData.append('whatsapp', editWhatsapp)
      if (editEmail) formData.append('email', editEmail)
      if (editJobImage) formData.append('image', editJobImage)

      await axios.put('/api/traditionaljobpost', formData)
      toast.success('Job post updated successfully')
      setOpen(false)
      fetchJobPosts()
      // Reset edit state
      setEditJobImage(null)
      setEditJobImagePreview(null)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update job post')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job post?')) return
    
    setIsDeleting(id)
    try {
      await axios.delete('/api/traditionaljobpost', { params: { id } })
      toast.success('Job post deleted successfully')
      fetchJobPosts()
    } catch (error) {
      toast.error('Failed to delete job post')
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleSort = (key: 'id' | 'title') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">Job Posts Management</h1>
         
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search job posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus:ring-green-500"
            />
            <span>Show</span>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>
          
          <div className="text-sm text-gray-600">
            Total entries: {total}
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <TableHeader className="bg-gray-100 dark:bg-zinc-800">
                <TableRow>
                  <TableHead onClick={() => toggleSort('id')} className="cursor-pointer px-4 py-2">
                    ID <ArrowUpDown className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead className="px-4 py-2">Image</TableHead>
                  <TableHead onClick={() => toggleSort('title')} className="cursor-pointer px-4 py-2">
                    Job Title <ArrowUpDown className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead className="px-4 py-2 max-w-md">Description</TableHead>
                  <TableHead className="px-4 py-2">Name</TableHead>
                  <TableHead className="px-4 py-2">WhatsApp</TableHead>
                  <TableHead className="px-4 py-2">Email</TableHead>
                  <TableHead className="px-4 py-2">Created</TableHead>
                  <TableHead className="px-4 py-2">Updated</TableHead>
                  <TableHead className="px-4 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No job posts found. Click "Add New Job Post" to create your first post.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobPosts.map((jobPost, idx) => (
                    <TableRow
                      key={jobPost.id}
                      className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                    >
                      <TableCell className="px-4 py-2">{(page - 1) * limit + idx + 1}</TableCell>
                      <TableCell className="px-4 py-2">
                        {jobPost.image ? (
                          <Image
                            src={jobPost.image.url}
                            alt={jobPost.image.alt}
                            width={50}
                            height={50}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <FileText className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2 font-medium">{jobPost.title}</TableCell>
                      <TableCell className="px-4 py-2 max-w-md">
                        <p className="truncate text-sm text-gray-600" title={jobPost.description}>
                          {jobPost.description}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm">{jobPost.name || '—'}</TableCell>
                      <TableCell className="px-4 py-2 text-sm">{jobPost.whatsapp || '—'}</TableCell>
                      <TableCell className="px-4 py-2 text-sm">{jobPost.email || '—'}</TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600">
                        {formatDistanceToNow(new Date(jobPost.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600">
                        {formatDistanceToNow(new Date(jobPost.updatedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditId(jobPost.id)
                              setEditTitle(jobPost.title)
                              setEditDescription(jobPost.description)
                              setEditName(jobPost.name || '')
                              setEditWhatsapp(jobPost.whatsapp || '')
                              setEditEmail(jobPost.email || '')
                              setEditJobImagePreview(jobPost.image?.url || null)
                              setOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(jobPost.id)}
                            disabled={isDeleting === jobPost.id}
                          >
                            {isDeleting === jobPost.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
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
          )}

          {!isLoading && total > limit && (
            <div className="mt-4 px-4 py-2 flex justify-center items-center">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  disabled={page === 1} 
                  onClick={() => setPage(page - 1)}
                  variant="outline"
                >
                  Previous
                </Button>
                {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? 'default' : 'outline'}
                    onClick={() => setPage(p)}
                    className={p === page ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  size="sm"
                  disabled={page * limit >= total}
                  onClick={() => setPage(page + 1)}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Job Title *</label>
                <Input 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  placeholder="Enter job title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Job Description *</label>
                <Textarea 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)} 
                  placeholder="Enter job description..."
                  rows={8}
                  className="resize-none"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp No <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <Input
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    placeholder="Enter WhatsApp number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Job Post Image</label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setEditJobImage(file)
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        setEditJobImagePreview(reader.result as string)
                      }
                      reader.readAsDataURL(file)
                    }
                  }} 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to keep current image
                </p>
              </div>
              
              {editJobImagePreview && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Preview</label>
                  <Image 
                    src={editJobImagePreview} 
                    alt="Preview" 
                    width={200} 
                    height={200} 
                    className="rounded object-cover" 
                  />
                </div>
              )}
            </div>
            
            <DialogFooter className="mt-4">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setOpen(false)
                  setEditJobImage(null)
                  setEditJobImagePreview(null)
                }} 
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button 
                className="bg-green-500 hover:bg-green-600" 
                onClick={handleUpdate} 
                disabled={isUpdating || !editTitle.trim() || !editDescription.trim()}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Updating...
                  </>
                ) : (
                  'Update Job Post'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}