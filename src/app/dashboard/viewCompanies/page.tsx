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
import { Pencil, Trash2, ArrowUpDown, Loader2 } from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Company {
  id: number
  companyName: string
  mobileNumber: string | null
  address: string | null
  email: string | null
  image: { url: string; alt: string; publicId: string | null } | null
  products: { id: number }[]
  createdAt: string
}

export default function ViewCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'companyName'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null)

  const [editId, setEditId] = useState<number | null>(null)
  const [editCompanyName, setEditCompanyName] = useState('')
  const [editMobileNumber, setEditMobileNumber] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCompanyImage, setEditCompanyImage] = useState<File | null>(null)
  const [editCompanyImagePreview, setEditCompanyImagePreview] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const fetchCompanies = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/company', {
        params: { search, sortBy, sortOrder, page, limit },
      })
      setCompanies(data.data)
      setTotal(data.total)
      setLastCreatedAt(data.lastSubmittedAt)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch companies')
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const handleUpdate = async () => {
    if (!editId) return

    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('id', editId.toString())
      formData.append('companyName', editCompanyName)
      if (editMobileNumber) formData.append('mobileNumber', editMobileNumber)
      if (editAddress) formData.append('address', editAddress)
      if (editEmail) formData.append('email', editEmail)
      if (editCompanyImage) formData.append('image', editCompanyImage)

      await axios.put('/api/company', formData)
      toast.success('Company updated')
      setOpen(false)
      fetchCompanies()
    } catch {
      toast.error('Failed to update company')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    setIsDeleting(id)
    try {
      await axios.delete('/api/company', { params: { id } })
      toast.error('Company deleted')
      fetchCompanies()
    } catch {
      toast.error('Failed to delete company')
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleSort = (key: 'id' | 'companyName') => {
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
        <h1 className="text-2xl font-bold text-center text-green-500">Companies</h1>

       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
  <div className="flex flex-col sm:flex-row gap-2 flex-wrap w-full sm:w-auto">
    <Input
      placeholder="Search companies..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="focus:ring-green-500 w-full sm:w-auto"
    />
    <div className="flex items-center gap-1">
      <span>Show</span>
      <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
        <SelectTrigger className="w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[10, 25, 50, 100].map((n) => (
            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>entries</span>
    </div>
  </div>
</div>
</div>


        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <TableHeader className="bg-gray-100 dark:bg-zinc-800">
              <TableRow>
                <TableHead onClick={() => toggleSort('id')} className="cursor-pointer px-4 py-2">ID <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                <TableHead className="px-4 py-2">Image</TableHead>
                <TableHead onClick={() => toggleSort('companyName')} className="cursor-pointer px-4 py-2">Company Name <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                <TableHead className="px-4 py-2">Mobile</TableHead>
                <TableHead className="px-4 py-2">Address</TableHead>
                <TableHead className="px-4 py-2">Email</TableHead>
                <TableHead className="px-4 py-2">Products</TableHead>
                <TableHead className="px-4 py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company, idx) => (
                <TableRow
                  key={company.id}
                  className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                >
                  <TableCell className="px-4 py-2">{(page - 1) * limit + idx + 1}</TableCell>
                  <TableCell className="px-4 py-2">
                    {company.image && (
                      <Image
                        src={company.image.url}
                        alt={company.image.alt}
                        width={50}
                        height={50}
                        className="rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-2">{company.companyName}</TableCell>
                  <TableCell className="px-4 py-2">{company.mobileNumber || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{company.address || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{company.email || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{company.products.length}</TableCell>
                  <TableCell className="px-4 py-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(company.id)
                        setEditCompanyName(company.companyName)
                        setEditMobileNumber(company.mobileNumber || '')
                        setEditAddress(company.address || '')
                        setEditEmail(company.email || '')
                        setEditCompanyImagePreview(company.image?.url || null)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(company.id)}
                      disabled={isDeleting === company.id}
                    >
                      {isDeleting === company.id ? (
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

        <div className="mt-4 px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
  <p className="text-muted-foreground">Total entries: {total}</p>
  <span>
    {lastCreatedAt
      ? `Last entry submitted ${formatDistanceToNow(new Date(lastCreatedAt))} ago`
      : 'No entries yet'}
  </span>
  <div className="flex flex-wrap gap-2">
    <Button size="sm" onClick={() => setPage(1)} disabled={page === 1}>First</Button>
    <Button size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</Button>
    {[...Array(Math.ceil(total / limit))].slice(Math.max(0, page - 2), page + 1).map((_, i) => {
      const pageNum = i + Math.max(1, page - 2)
      return (
        <Button
          key={pageNum}
          size="sm"
          variant={page === pageNum ? 'default' : 'outline'}
          onClick={() => setPage(pageNum)}
          className={page === pageNum ? 'bg-green-500 text-white' : ''}
        >
          {pageNum}
        </Button>
      )
    })}
    <Button
      size="sm"
      onClick={() => setPage(page + 1)}
      disabled={page * limit >= total}
    >
      Next
    </Button>
    <Button
      size="sm"
      onClick={() => setPage(Math.ceil(total / limit))}
      disabled={page === Math.ceil(total / limit)}
    >
      Last
    </Button>
  </div>
</div>


        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Company</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name</label>
                  <Input value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mobile Number</label>
                  <Input value={editMobileNumber} onChange={(e) => setEditMobileNumber(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Company Image</label>
                  <Input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setEditCompanyImage(file)
                    if (file) setEditCompanyImagePreview(URL.createObjectURL(file))
                  }} />
                </div>
                {editCompanyImagePreview && (
                  <Image src={editCompanyImagePreview} alt="Preview" width={100} height={100} className="rounded" />
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={isUpdating}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>) : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
