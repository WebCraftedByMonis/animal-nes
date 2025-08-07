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
import { Pencil, Trash2, ArrowUpDown, Loader2, Plus, MoveUp, MoveDown } from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

interface Banner {
  id: number
  position: number
  image: { 
    url: string
    alt: string
    publicId: string | null 
  } | null
  createdAt: string
  updatedAt: string
}

export default function ViewBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [editId, setEditId] = useState<number | null>(null)
  const [editPosition, setEditPosition] = useState('')
  const [editAlt, setEditAlt] = useState('')
  const [editBannerImage, setEditBannerImage] = useState<File | null>(null)
  const [editBannerImagePreview, setEditBannerImagePreview] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBanners = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/banner', {
        params: { sortOrder, page, limit },
      })
      setBanners(data.data)
      setTotal(data.total)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch banners')
    } finally {
      setIsLoading(false)
    }
  }, [sortOrder, page, limit])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const handleUpdate = async () => {
    if (!editId) return

    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('id', editId.toString())
      if (editPosition) formData.append('position', editPosition)
      if (editAlt) formData.append('alt', editAlt)
      if (editBannerImage) formData.append('image', editBannerImage)

      const response = await axios.put('/api/banner', formData)
      
      if (response.status === 200) {
        toast.success('Banner updated successfully')
        setOpen(false)
        fetchBanners()
        // Reset edit state
        setEditBannerImage(null)
        setEditBannerImagePreview(null)
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error('Failed to update banner')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this banner?')) return
    
    setIsDeleting(id)
    try {
      await axios.delete('/api/banner', { params: { id } })
      toast.success('Banner deleted successfully')
      fetchBanners()
    } catch (error) {
      toast.error('Failed to delete banner')
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const handleSwapPositions = async (banner1: Banner, banner2: Banner) => {
    try {
      // Swap positions by updating both banners
      const tempPosition = banner1.position
      
      // Update first banner with second banner's position
      const formData1 = new FormData()
      formData1.append('id', banner1.id.toString())
      formData1.append('position', banner2.position.toString())
      
      // Update second banner with first banner's position
      const formData2 = new FormData()
      formData2.append('id', banner2.id.toString())
      formData2.append('position', tempPosition.toString())
      
      // First, set banner1 to a temporary position to avoid conflict
      const tempFormData = new FormData()
      tempFormData.append('id', banner1.id.toString())
      tempFormData.append('position', '9999')
      
      await axios.put('/api/banner', tempFormData)
      await axios.put('/api/banner', formData2)
      await axios.put('/api/banner', formData1)
      
      toast.success('Positions swapped successfully')
      fetchBanners()
    } catch (error) {
      toast.error('Failed to swap positions')
    }
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">Banner Management</h1>
          
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <span>Show</span>
            <Select value={String(limit)} onValueChange={(v) => setLimit(v === 'all' ? 9999 : Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 'all'].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 'all' ? 'All' : n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>
          
          <div className="text-sm text-gray-600">
            Total banners: {total}
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <TableHeader className="bg-gray-100 dark:bg-zinc-800">
                <TableRow>
                  <TableHead className="px-4 py-2">S.No</TableHead>
                  <TableHead className="px-4 py-2">Preview</TableHead>
                  <TableHead onClick={toggleSort} className="cursor-pointer px-4 py-2">
                    Position <ArrowUpDown className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead className="px-4 py-2">Alt Text</TableHead>
                  <TableHead className="px-4 py-2">Created</TableHead>
                  <TableHead className="px-4 py-2">Updated</TableHead>
                  <TableHead className="px-4 py-2">Quick Actions</TableHead>
                  <TableHead className="px-4 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No banners found. Add your first banner to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  banners.map((banner, idx) => (
                    <TableRow
                      key={banner.id}
                      className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                    >
                      <TableCell className="px-4 py-2">{(page - 1) * limit + idx + 1}</TableCell>
                      <TableCell className="px-4 py-2">
                        {banner.image ? (
                          <div className="relative w-32 h-20">
                            <Image
                              src={banner.image.url}
                              alt={banner.image.alt}
                              fill
                              className="rounded object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                            No Image
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <span className="font-semibold text-green-600">{banner.position}</span>
                      </TableCell>
                      <TableCell className="px-4 py-2">{banner.image?.alt || '-'}</TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600">
                        {formatDistanceToNow(new Date(banner.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600">
                        {formatDistanceToNow(new Date(banner.updatedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex gap-1">
                          {idx > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSwapPositions(banner, banners[idx - 1])}
                              title="Move up"
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                          )}
                          {idx < banners.length - 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSwapPositions(banner, banners[idx + 1])}
                              title="Move down"
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditId(banner.id)
                              setEditPosition(banner.position.toString())
                              setEditAlt(banner.image?.alt || '')
                              setEditBannerImagePreview(banner.image?.url || null)
                              setOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(banner.id)}
                            disabled={isDeleting === banner.id}
                          >
                            {isDeleting === banner.id ? (
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Banner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Position *</label>
                  <Input 
                    type="number"
                    min="1"
                    value={editPosition} 
                    onChange={(e) => setEditPosition(e.target.value)} 
                    placeholder="Banner position (1, 2, 3...)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alt Text *</label>
                  <Input 
                    value={editAlt} 
                    onChange={(e) => setEditAlt(e.target.value)} 
                    placeholder="Image description for accessibility"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Banner Image</label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setEditBannerImage(file)
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        setEditBannerImagePreview(reader.result as string)
                      }
                      reader.readAsDataURL(file)
                    }
                  }} 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to keep current image
                </p>
              </div>
              
              {editBannerImagePreview && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Preview</label>
                  <div className="relative w-full h-48">
                    <Image 
                      src={editBannerImagePreview} 
                      alt="Preview" 
                      fill
                      className="rounded object-contain border border-gray-200" 
                    />
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="mt-4">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setOpen(false)
                  setEditBannerImage(null)
                  setEditBannerImagePreview(null)
                }} 
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button 
                className="bg-green-500 hover:bg-green-600" 
                onClick={handleUpdate} 
                disabled={isUpdating || (!editPosition && !editAlt && !editBannerImage)}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Updating...
                  </>
                ) : (
                  'Update Banner'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}