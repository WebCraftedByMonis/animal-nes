'use client'

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { SuggestiveInput } from '@/components/shared/SuggestiveInput'
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

// Specialization options based on partner type
const veterinarianSpecializations = [
  'Large Animal Veterinarian',
  'Small Animal Veterinarian',
  'Poultry Veterinarian',
  'Parasitologist',
  'Reproduction Specialist',
  'Animal Nutritionist',
  'Veterinary Surgeon',
  'Veterinary Pathologist',
  'Wildlife Veterinarian',
  'Public Health Veterinarian'
];

const salesMarketingSpecializations = [
  'Product Specialist',
  'Equipment Executive',
  'Brand Manager',
  'Sales Officer',
  'Marketing Specialist',
  'Authorized Dealer',
  'Bulk Wholesaler',
  'Regional Distributor',
  'Licensed Importer',
  'Product Manufacturer'
];


// Image component with error handling
const PartnerImage = ({ imageUrl, altText }: { imageUrl: string; altText: string }) => {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="relative w-[50px] h-[50px]">
      {!imageError ? (
        <Image
          src={imageUrl}
          alt={altText}
          width={50}
          height={50}
          className="rounded object-cover"
          onError={() => {
            setImageError(true)
            setIsLoading(false)
          }}
          onLoad={() => setIsLoading(false)}
        />
      ) : (
        <div className="w-[50px] h-[50px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
          <span className="text-xs text-gray-500">No Image</span>
        </div>
      )}
      {isLoading && !imageError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      )}
    </div>
  )
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
  const [isLoading, setIsLoading] = useState(true)

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
  const [editGender, setEditGender] = useState<string>('');
  const [editPartnerType, setEditPartnerType] = useState<string>('');
  const [originalPartnerType, setOriginalPartnerType] = useState<string>('');


  const [editImage, setEditImage] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [editAvailableDays, setEditAvailableDays] = useState<string[]>([])



  // Get specialization suggestions based on partner type
  const editSpecializationSuggestions = useMemo(() => {
    if (editPartnerType === 'Veterinarian (Clinic, Hospital, Consultant)') {
      return veterinarianSpecializations;
    } else if (editPartnerType === 'Sales and Marketing (Dealer, Distributor, Sales Person)') {
      return salesMarketingSpecializations;
    }
    return [];
  }, [editPartnerType]);




  // Clear specialization when partner type changes
useEffect(() => {
  if (open && editPartnerType && editPartnerType !== originalPartnerType) {
    setEditSpecialization('');
  }
}, [editPartnerType, originalPartnerType, open]);

  const fetchPartners = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/partner', {
        params: { search, sortBy, order: sortOrder, page, limit }
      })
      console.log('API Response:', data);

      setPartners(data.data || [])
      setTotal(data.meta?.total || data.total || 0) // Handle both response formats
      setLastCreatedAt(data.data?.[0]?.createdAt || null)

      // Show success message only if we have data
      if (data.data && data.data.length > 0) {
        // Don't show success toast for normal loading
      }
    } catch (error) {
      console.error('Fetch partners error:', error)
      toast.error('Failed to fetch partners')
      setPartners([])
      setTotal(0)
    } finally {
      setIsLoading(false)
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
      if (editGender) updateData.gender = editGender
      if (editPartnerType) updateData.partnerType = editPartnerType
      if (editAvailableDays.length > 0) updateData.availableDays = editAvailableDays

      // Handle image upload - convert to base64 like in your POST request
      if (editImage) {
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            updateData.image = reader.result as string
            await sendUpdate(updateData)
          } catch (error) {
            console.error('Update error:', error)
            toast.error('Failed to update partner')
            setIsUpdating(false)
          }
        }
        reader.onerror = () => {
          toast.error('Failed to read image file')
          setIsUpdating(false)
        }
        reader.readAsDataURL(editImage)
      } else {
        await sendUpdate(updateData)
      }

    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update partner')
      setIsUpdating(false)
    }
  }

  const sendUpdate = async (updateData: any) => {
    try {
      const response = await axios.put(`/api/partner?id=${editId}`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200) {
        toast.success('Partner updated successfully')
        setOpen(false)
        fetchPartners()
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
      toast.success('Partner deleted successfully')
      fetchPartners()
    } catch (error) {
      console.error('Delete error:', error)
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

  if (isLoading) {
    return <TableSkeleton />
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
              {partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-8 text-gray-500">
                    No partners found
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner, idx) => (
                  <TableRow
                    key={partner.id}
                    className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                  >
                    <TableCell className="px-4 py-2">{(page - 1) * limit + idx + 1}</TableCell>
                    <TableCell className="px-4 py-2">
                      {partner.partnerImage ? (
                        <PartnerImage
                          imageUrl={partner.partnerImage.url}
                          altText={`${partner.partnerName} image`}
                        />
                      ) : (
                        <div className="w-[50px] h-[50px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">No Image</span>
                        </div>
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
                          setEditGender(partner.gender || '');
                          setEditPartnerType(partner.partnerType || '');
                          setOriginalPartnerType(partner.partnerType || '');
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
                ))
              )}
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

        {/* Edit Dialog - MOBILE RESPONSIVE */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Partner</DialogTitle>
            </DialogHeader>

            {/* SINGLE COLUMN LAYOUT ON MOBILE, TWO COLUMNS ON LARGER SCREENS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

              {/* Partner Name */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Partner Name</label>
                <Input value={editPartnerName} onChange={(e) => setEditPartnerName(e.target.value)} />
              </div>

              {/* Mobile Number */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Mobile Number</label>
                <Input value={editMobileNumber} onChange={(e) => setEditMobileNumber(e.target.value)} />
              </div>

              {/* Gender */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Gender</label>
                <Select value={editGender} onValueChange={setEditGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">MALE</SelectItem>
                    <SelectItem value="FEMALE">FEMALE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Partner Type */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Partner Type</label>
                <Select value={editPartnerType} onValueChange={setEditPartnerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Veterinarian (Clinic, Hospital, Consultant)">
                      Veterinarian (Clinic, Hospital, Consultant)
                    </SelectItem>
                    <SelectItem value="Sales and Marketing (Dealer, Distributor, Sales Person)">
                      Sales and Marketing (Dealer, Distributor, Sales Person)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>

              {/* City */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">City</label>
                <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
              </div>

              {/* Specialization */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Specialization</label>
                {editPartnerType ? (
                  <SuggestiveInput
                    suggestions={editSpecializationSuggestions}
                    value={editSpecialization}
                    onChange={(v) => setEditSpecialization(v)}
                    placeholder={
                      editPartnerType === 'Veterinarian (Clinic, Hospital, Consultant)'
                        ? "Select veterinary specialization"
                        : "Select sales/marketing specialization"
                    }
                  />
                ) : (
                  <Input
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    placeholder="Select partner type first"
                    disabled
                  />
                )}
              </div>

              {/* Qualification Degree */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Qualification Degree</label>
                <Input value={editQualificationDegree} onChange={(e) => setEditQualificationDegree(e.target.value)} />
              </div>

              {/* Shop Name */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Shop Name</label>
                <Input value={editShopName} onChange={(e) => setEditShopName(e.target.value)} />
              </div>

              {/* RVMP Number */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">RVMP Number/ License Number</label>
                <Input value={editRvmpNumber} onChange={(e) => setEditRvmpNumber(e.target.value)} />
              </div>

              {/* State */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">State</label>
                <Input value={editState} onChange={(e) => setEditState(e.target.value)} />
              </div>

              {/* Zipcode */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Zipcode</label>
                <Input value={editZipcode} onChange={(e) => setEditZipcode(e.target.value)} />
              </div>

              {/* Area Town */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Date of birth</label>
                <Input value={editAreaTown} onChange={(e) => setEditAreaTown(e.target.value)} />
              </div>

              {/* Address */}
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Address/ Map link</label>
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>

              {/* Partner Image */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Partner Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setEditImage(file)
                    if (file) setEditImagePreview(URL.createObjectURL(file))
                  }}
                  className="w-full"
                />
              </div>

              {/* Image Preview */}
              {editImagePreview && (
                <div className="col-span-1 sm:col-span-2 flex justify-center sm:justify-start">
                  <PartnerImage imageUrl={editImagePreview} altText="Preview" />
                </div>
              )}

              {/* Available Days - Full width on all screens */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium mb-2">Available Days</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                      <span className="text-sm">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isUpdating}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
                onClick={handleUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>) : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Suspense>
  )
}