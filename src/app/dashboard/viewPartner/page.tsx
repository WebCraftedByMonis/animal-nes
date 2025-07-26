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
import { Checkbox } from '@/components/ui/checkbox'
interface Partner {
  id: number
  partnerName: string
  gender?: string
  partnerEmail?: string
  partnerMobileNumber?: string
  cityName?: string
  state?: string
  fullAddress?: string
  shopName?: string
  qualificationDegree?: string
  rvmpNumber?: string
  sendToPartner?: string
  specialization?: string
  species?: string
  partnerType?: string
  bloodGroup?: string
  zipcode?: string
  areaTown?: string
  availableDaysOfWeek: { day: string }[]
  startTimeIds?: number[]
  productIds?: number[]
  partnerImage: { url: string; publicId: string } | null
  products: { id: number }[]
  createdAt: string
}


export default function ViewPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'partnerName'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null)

  const [editId, setEditId] = useState<number | null>(null)
  const [editPartnerName, setEditPartnerName] = useState('')
  const [editMobileNumber, setEditMobileNumber] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editQualificationDegree, setEditQualificationDegree] = useState('');

  const [editShopName, setEditShopName] = useState('');
  const [editRvmpNumber, setEditRvmpNumber] = useState('');
  const [editState, setEditState] = useState('');
  const [editZipcode, setEditZipcode] = useState('');
  const [editAreaTown, setEditAreaTown] = useState('');

  const [editImage, setEditImage] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [editAvailableDays, setEditAvailableDays] = useState<string[]>([])


  const fetchPartners = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/partner', {
        params: { search, sortBy, sortOrder, page, limit }
      })
      console.log(data);
      setPartners(data.data)
      setTotal(data.meta.total)
      setLastCreatedAt(data.data[0]?.createdAt || null)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch partners')
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])
  const handleUpdate = async () => {
    if (!editId) return

    setIsUpdating(true)
    try {
      // Build the update data object
      const updateData: any = {
        partnerName: editPartnerName,
      }

      // Only include fields that have values
      if (editMobileNumber) updateData.partnerMobileNumber = editMobileNumber
      if (editEmail) updateData.partnerEmail = editEmail
      if (editCity) updateData.cityName = editCity
      if (editAddress) updateData.fullAddress = editAddress
      if (editSpecialization) updateData.specialization = editSpecialization
      if (editQualificationDegree) updateData.qualificationDegree = editQualificationDegree
      if (editShopName) updateData.shopName = editShopName
      if (editRvmpNumber) updateData.rvmpNumber = editRvmpNumber
      if (editState) updateData.state = editState
      if (editZipcode) updateData.zipcode = editZipcode
      if (editAreaTown) updateData.areaTown = editAreaTown
      if (editAvailableDays.length > 0) updateData.availableDays = editAvailableDays
      // Handle image upload - convert to base64 like in your POST request
      if (editImage) {
        const reader = new FileReader()
        reader.onload = async () => {
          updateData.image = reader.result as string
          await sendUpdate()
        }
        reader.readAsDataURL(editImage)
      } else {
        await sendUpdate()
      }

      async function sendUpdate() {
        const response = await axios.put(`/api/partner?id=${editId}`, updateData, {
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.status === 200) {
          toast.success('Partner updated')
          setOpen(false)
          fetchPartners()
        }
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update partner')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    setIsDeleting(id)
    try {
      await axios.delete('/api/partner', { params: { id } })
      toast.error('Partner deleted')
      fetchPartners()
    } catch {
      toast.error('Failed to delete partner')
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleSort = (key: 'id' | 'partnerName') => {
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
        <h1 className="text-2xl font-bold text-center text-green-500">Partners</h1>

        {/* Search and Filters Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search partners..."
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
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>
        </div>

        {/* Partners Table */}
        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <TableHeader className="bg-gray-100 dark:bg-zinc-800">
              <TableRow>
                <TableHead onClick={() => toggleSort('id')} className="cursor-pointer px-4 py-2">
                  ID <ArrowUpDown className="inline h-4 w-4" />
                </TableHead>
                <TableHead className="px-4 py-2">Image</TableHead>
                <TableHead onClick={() => toggleSort('partnerName')} className="cursor-pointer px-4 py-2">
                  Partner Name <ArrowUpDown className="inline h-4 w-4" />
                </TableHead>
                <TableHead className="px-4 py-2">Mobile</TableHead>
                <TableHead className="px-4 py-2">City</TableHead>
                <TableHead className="px-4 py-2">Partner Type</TableHead>
                <TableHead className="px-4 py-2">Shop Name</TableHead>
                <TableHead className="px-4 py-2">Specialization</TableHead>
                <TableHead className="px-4 py-2">Qualification</TableHead>
                <TableHead className="px-4 py-2">State</TableHead>
                <TableHead className="px-4 py-2">Blood Group</TableHead>
                <TableHead className="px-4 py-2">Available Days</TableHead>
                <TableHead className="px-4 py-2">Send To Partner</TableHead>
                <TableHead className="px-4 py-2">Created</TableHead>

                <TableHead className="px-4 py-2">Products</TableHead>
                <TableHead className="px-4 py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner, idx) => (
                <TableRow
                  key={partner.id}
                  className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                >
                  <TableCell className="px-4 py-2">{(page - 1) * limit + idx + 1}</TableCell>
                  <TableCell className="px-4 py-2">
                    {partner.partnerImage && (
                      <Image
                        src={partner.partnerImage.url}
                        alt="Partner image"
                        width={50}
                        height={50}
                        className="rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-2">{partner.partnerName}</TableCell>
                  <TableCell className="px-4 py-2">{partner.partnerMobileNumber || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{partner.cityName || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{partner.partnerType || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{partner.shopName || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{partner.specialization || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{partner.qualificationDegree || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{partner.state || '-'}</TableCell>
                  <TableCell className="px-4 py-2">{partner.bloodGroup || '-'}</TableCell>
                  <TableCell className="px-4 py-2">
                    {partner.availableDaysOfWeek?.map((d) => d.day).join(', ') || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-2">{partner.sendToPartner || '-'}</TableCell>
                  <TableCell className="px-4 py-2">
                    {formatDistanceToNow(new Date(partner.createdAt))} ago
                  </TableCell>

                  <TableCell className="px-4 py-2">{partner.products.length}</TableCell>
                  <TableCell className="px-4 py-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(partner.id)
                        setEditPartnerName(partner.partnerName)
                        setEditMobileNumber(partner.partnerMobileNumber || '')
                        setEditEmail(partner.partnerEmail || '')
                        setEditCity(partner.cityName || '')
                        setEditSpecialization(partner.specialization || '');
                        setEditQualificationDegree(partner.qualificationDegree || '');
                        setEditAvailableDays(partner.availableDaysOfWeek?.map(d => d.day) || [])
                        setEditShopName(partner.shopName || '');
                        setEditRvmpNumber(partner.rvmpNumber || '');
                        setEditState(partner.state || '');
                        setEditZipcode(partner.zipcode || '');
                        setEditAreaTown(partner.areaTown || '');

                        setEditAddress(partner.fullAddress || '')
                        setEditImagePreview(partner.partnerImage?.url || null)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(partner.id)}
                      disabled={isDeleting === partner.id}
                    >
                      {isDeleting === partner.id ? (
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


          {/* Pagination */}
          <div className="mt-4 px-4 py-2 flex justify-between items-center text-sm">
            <p className="text-muted-foreground">Total entries: {total}</p>
            <span>
              {lastCreatedAt
                ? `Last entry submitted ${formatDistanceToNow(new Date(lastCreatedAt))} ago`
                : 'No entries yet'}
            </span>
            <div className="flex gap-2">
              <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
              {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? 'default' : 'outline'}
                  onClick={() => setPage(p)}
                  className={p === page ? 'bg-green-500 text-white' : ''}
                >
                  {p}
                </Button>
              ))}
              <Button
                size="sm"
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Partner</DialogTitle>
            </DialogHeader>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Partner Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Partner Name</label>
                <Input value={editPartnerName} onChange={(e) => setEditPartnerName(e.target.value)} />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number</label>
                <Input value={editMobileNumber} onChange={(e) => setEditMobileNumber(e.target.value)} />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-sm font-medium mb-1">Specialization</label>
                <Input value={editSpecialization} onChange={(e) => setEditSpecialization(e.target.value)} />
              </div>

              {/* Qualification Degree */}
              <div>
                <label className="block text-sm font-medium mb-1">Qualification Degree</label>
                <Input value={editQualificationDegree} onChange={(e) => setEditQualificationDegree(e.target.value)} />
              </div>

              {/* Species */}

              {/* Available Days - Using UI Checkbox component */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Available Days</label>
                <div className="flex flex-wrap gap-3">
                  {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => (
                    <label key={day} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={editAvailableDays.includes(day)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditAvailableDays([...editAvailableDays, day])
                          } else {
                            setEditAvailableDays(editAvailableDays.filter(d => d !== day))
                          }
                        }}
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Shop Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Shop Name</label>
                <Input value={editShopName} onChange={(e) => setEditShopName(e.target.value)} />
              </div>

              {/* RVMP Number */}
              <div>
                <label className="block text-sm font-medium mb-1">RVMP Number</label>
                <Input value={editRvmpNumber} onChange={(e) => setEditRvmpNumber(e.target.value)} />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <Input value={editState} onChange={(e) => setEditState(e.target.value)} />
              </div>

              {/* Zipcode */}
              <div>
                <label className="block text-sm font-medium mb-1">Zipcode</label>
                <Input value={editZipcode} onChange={(e) => setEditZipcode(e.target.value)} />
              </div>

              {/* Area Town */}
              <div>
                <label className="block text-sm font-medium mb-1">Date of birth</label>
                <Input value={editAreaTown} onChange={(e) => setEditAreaTown(e.target.value)} />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>

              {/* Partner Image */}
              <div>
                <label className="block text-sm font-medium mb-1">Partner Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setEditImage(file)
                    if (file) setEditImagePreview(URL.createObjectURL(file))
                  }}
                />
              </div>

              {/* Image Preview */}
              {editImagePreview && (
                <div className="col-span-2">
                  <Image src={editImagePreview} alt="Preview" width={100} height={100} className="rounded" />
                </div>
              )}

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