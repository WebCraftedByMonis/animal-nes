'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, ArrowUpDown, Loader2 } from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface NewsItem {
  id: number
  title: string
  description: string
  createdAt: string
  image?: {
    id: number
    url: string
    alt: string
    publicId?: string
  } | null
  pdf?: {
    id: number
    url: string
    title: string
    publicId?: string
  } | null
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImage, setEditImage] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [editPdf, setEditPdf] = useState<File | null>(null)

  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const fetchNews = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/animal-news', {
        params: { search, page, limit },
      })
      setNews(data.data)
      setTotal(data.total)
    } catch (err) {
      toast.error('Failed to fetch news')
    }
  }, [search, page, limit])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const handleDelete = async (id: number) => {
    setIsDeleting(id)
    try {
      await axios.delete('/api/animal-news', { params: { id } })
      toast.success('News deleted')
      fetchNews()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleUpdate = async () => {
    if (!editId) return
    setIsUpdating(true)

    const formData = new FormData()
    formData.append('id', editId.toString())
    formData.append('title', editTitle)
    formData.append('description', editDescription)
    if (editImage) formData.append('image', editImage)
    if (editPdf) formData.append('pdf', editPdf)

    try {
      await axios.put('/api/animal-news', formData)
      toast.success('News updated')
      setOpen(false)
      fetchNews()
    } catch {
      toast.error('Failed to update')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-green-500">Animal News</h1>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search news..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span>Show</span>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                
                <TableHead>PDF</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {news.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>{(page - 1) * limit + i + 1}</TableCell>
                  <TableCell>
                    {item.image && (
                      <Image src={item.image.url} alt={item.image.alt} width={50} height={50} className="rounded" />
                    )}
                  </TableCell>
                  <TableCell>{item.title}</TableCell>
                  
                  <TableCell>
                    {item.pdf && (
                      <a
                        href={item.pdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        PDF
                      </a>
                    )}
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(item.createdAt))} ago</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(item.id)
                        setEditTitle(item.title)
                        setEditDescription(item.description)
                        setEditImagePreview(item.image?.url || null)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isDeleting === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {isDeleting === item.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center p-4 text-sm">
            <p>Total entries: {total}</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <Button size="sm" disabled={page * limit >= total} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
  <DialogHeader>
    <DialogTitle>Edit News</DialogTitle>
  </DialogHeader>

  <div className="grid grid-cols-1 gap-4">
    <div>
      <label htmlFor="editNewsTitle" className="block text-sm font-medium mb-1">
        Title
      </label>
      <Input
        id="editNewsTitle"
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
      />
    </div>

    <div>
  <label htmlFor="editNewsDescription" className="block text-sm font-medium mb-1">
    Description
  </label>
  <Textarea
    id="editNewsDescription"
    value={editDescription}
    onChange={(e) => setEditDescription(e.target.value)}
  />
</div>


    <div>
      <label htmlFor="editNewsImage" className="block text-sm font-medium mb-1">
        Image
      </label>
      <Input
        id="editNewsImage"
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0] || null
          setEditImage(file)
          if (file) {
            setEditImagePreview(URL.createObjectURL(file))
          }
        }}
      />
    </div>

    {editImagePreview && (
      <Image
        src={editImagePreview}
        alt="Preview"
        width={100}
        height={100}
        className="rounded mt-2"
      />
    )}
  </div>

  <DialogFooter className="mt-4">
    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isUpdating}>
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
        'Update'
      )}
    </Button>
  </DialogFooter>
</DialogContent>

        </Dialog>
      </div>
    </Suspense>
  )
}
