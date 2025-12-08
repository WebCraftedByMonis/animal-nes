'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
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
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, ArrowUpDown, Loader2, AlertCircle, Clock } from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Animal {
  id: number
  specie: string
  breed: string
  quantity: number
  ageType: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'
  ageNumber: number
  weightType: 'GRAMS' | 'KGS' | 'MUNS' | 'TONS'
  weightValue: number
  gender: 'MALE' | 'FEMALE'
  location: string
  healthCertificate: boolean
  totalPrice: number
  purchasePrice: number
  referredBy: string | null
  status: string
  autoDelete: boolean
  images: { url: string; alt: string; publicId: string | null }[]
  videos: { url: string; alt: string; publicId: string | null }[]
  createdAt: string
  updatedAt: string
}

export default function ViewAnimalsPage() {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'specie' | 'totalPrice' | 'createdAt'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null)

  const [editId, setEditId] = useState<number | null>(null)
  const [editSpecie, setEditSpecie] = useState('')
  const [editBreed, setEditBreed] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editAgeType, setEditAgeType] = useState<'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'>('YEARS')
  const [editAgeNumber, setEditAgeNumber] = useState('')
  const [editWeightType, setEditWeightType] = useState<'GRAMS' | 'KGS' | 'MUNS' | 'TONS'>('KGS')
  const [editWeightValue, setEditWeightValue] = useState('')
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [editLocation, setEditLocation] = useState('')
  const [editHealthCertificate, setEditHealthCertificate] = useState(false)
  const [editTotalPrice, setEditTotalPrice] = useState('')
  const [editPurchasePrice, setEditPurchasePrice] = useState('')
  const [editReferredBy, setEditReferredBy] = useState('')
  const [editStatus, setEditStatus] = useState('PENDING')
  const [editAutoDelete, setEditAutoDelete] = useState(true)
  const [editAnimalImage, setEditAnimalImage] = useState<File | null>(null)
  const [editAnimalImagePreview, setEditAnimalImagePreview] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [isAutoDeleting, setIsAutoDeleting] = useState(false)

  const fetchAnimals = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/sell-animal', {
        params: { 
          q: search, 
          sort: sortBy, 
          order: sortOrder, 
          page, 
          limit 
        },
      })
      setAnimals(data.items)
      setTotal(data.total)
      if (data.items.length > 0) {
        setLastCreatedAt(data.items[0].createdAt)
      }
      
      // Auto-delete old animals (30+ days)
      autoDeleteOldAnimals(data.items)
    } catch (error) {
      console.log(error)
      // Skip the login check for this page as requested
      if (axios.isAxiosError(error) && error.response?.status !== 401) {
        toast.error('Failed to fetch animals')
      }
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchAnimals()
  }, [fetchAnimals])

  // Auto-delete animals older than 30 days (only if autoDelete is enabled)
  const autoDeleteOldAnimals = async (animalsList: Animal[]) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const oldAnimals = animalsList.filter(animal =>
      new Date(animal.createdAt) < thirtyDaysAgo && animal.autoDelete
    )
    
    if (oldAnimals.length > 0 && !isAutoDeleting) {
      setIsAutoDeleting(true)
      try {
        for (const animal of oldAnimals) {
          await axios.delete('/api/sell-animal', { params: { id: animal.id } })
        }
        toast.info(`Auto-deleted ${oldAnimals.length} listings older than 30 days`)
        fetchAnimals()
      } catch (error) {
        console.error('Failed to auto-delete old animals:', error)
      } finally {
        setIsAutoDeleting(false)
      }
    }
  }

  const handleUpdate = async () => {
    if (!editId) return

    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('id', editId.toString())
      formData.append('specie', editSpecie)
      formData.append('breed', editBreed)
      formData.append('quantity', editQuantity)
      formData.append('ageType', editAgeType)
      formData.append('ageNumber', editAgeNumber)
      formData.append('weightType', editWeightType)
      formData.append('weightValue', editWeightValue)
      formData.append('gender', editGender)
      formData.append('location', editLocation)
      formData.append('healthCertificate', editHealthCertificate.toString())
      formData.append('totalPrice', editTotalPrice)
      formData.append('purchasePrice', editPurchasePrice)
      formData.append('status', editStatus)
      formData.append('autoDelete', editAutoDelete.toString())
      if (editReferredBy) formData.append('referredBy', editReferredBy)
      if (editAnimalImage) formData.append('image', editAnimalImage)

      await axios.put('/api/sell-animal', formData)
      toast.success('Animal listing updated')
      setOpen(false)
      fetchAnimals()
    } catch {
      toast.error('Failed to update animal listing')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    setIsDeleting(id)
    try {
      await axios.delete('/api/sell-animal', { params: { id } })
      toast.success('Animal listing deleted')
      fetchAnimals()
    } catch {
      toast.error('Failed to delete animal listing')
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleSort = (key: 'id' | 'specie' | 'totalPrice' | 'createdAt') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const getDaysRemaining = (createdAt: string) => {
    const daysOld = differenceInDays(new Date(), new Date(createdAt))
    const daysRemaining = 30 - daysOld
    return daysRemaining
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'outline',
      ACCEPTED: 'default',
      REJECTED: 'destructive',
    }
    const colors: Record<string, string> = {
      ACCEPTED: 'bg-green-500',
      REJECTED: '',
      PENDING: '',
    }
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status] || ''}>
        {status}
      </Badge>
    )
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-green-500">Manage Animal Listings</h1>

        {isAutoDeleting && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">Auto-deleting old listings...</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search animals..."
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
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <TableHeader className="bg-gray-100 dark:bg-zinc-800">
              <TableRow>
                <TableHead onClick={() => toggleSort('id')} className="cursor-pointer px-4 py-2">
                  ID <ArrowUpDown className="inline h-4 w-4" />
                </TableHead>
                <TableHead className="px-4 py-2">Image</TableHead>
                <TableHead onClick={() => toggleSort('specie')} className="cursor-pointer px-4 py-2">
                  Specie <ArrowUpDown className="inline h-4 w-4" />
                </TableHead>
                <TableHead className="px-4 py-2">Breed</TableHead>
                <TableHead className="px-4 py-2">Qty</TableHead>
                <TableHead className="px-4 py-2">Age</TableHead>
                <TableHead className="px-4 py-2">Weight</TableHead>
                <TableHead className="px-4 py-2">Gender</TableHead>
                <TableHead className="px-4 py-2">Location</TableHead>
                <TableHead onClick={() => toggleSort('totalPrice')} className="cursor-pointer px-4 py-2">
                  Price <ArrowUpDown className="inline h-4 w-4" />
                </TableHead>
                <TableHead className="px-4 py-2">Health Cert</TableHead>
                <TableHead className="px-4 py-2">Status</TableHead>
                <TableHead onClick={() => toggleSort('createdAt')} className="cursor-pointer px-4 py-2">
                  Listed <ArrowUpDown className="inline h-4 w-4" />
                </TableHead>
                <TableHead className="px-4 py-2">Expires</TableHead>
                <TableHead className="px-4 py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {animals.map((animal, idx) => {
                const daysRemaining = getDaysRemaining(animal.createdAt)
                const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0
                const isExpired = daysRemaining <= 0
                
                return (
                  <TableRow
                    key={animal.id}
                    className={`
                      ${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                      ${isExpired ? 'opacity-50' : ''}
                      ${isExpiringSoon ? 'border-l-4 border-l-yellow-500' : ''}
                    `}
                  >
                    <TableCell className="px-4 py-2">{(page - 1) * limit + idx + 1}</TableCell>
                    <TableCell className="px-4 py-2">
                      {animal.images?.[0] && (
                        <Image
                          src={animal.images[0].url}
                          alt={animal.images[0].alt || animal.specie}
                          width={50}
                          height={50}
                          className="rounded object-cover"
                        />
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2 font-medium">{animal.specie}</TableCell>
                    <TableCell className="px-4 py-2">{animal.breed}</TableCell>
                    <TableCell className="px-4 py-2">{animal.quantity}</TableCell>
                    <TableCell className="px-4 py-2">
                      {animal.ageNumber} {animal.ageType.toLowerCase()}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {animal.weightValue} {animal.weightType.toLowerCase()}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge variant="outline" className={animal.gender === 'MALE' ? 'border-blue-500' : 'border-pink-500'}>
                        {animal.gender}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">{animal.location}</TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        PKR {animal.totalPrice.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {animal.healthCertificate ? (
                        <Badge className="bg-green-100 text-green-800">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2">{getStatusBadge(animal.status)}</TableCell>
                    <TableCell className="px-4 py-2 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(animal.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex flex-col gap-1">
                        {isExpired ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            {daysRemaining}d left
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{daysRemaining}d left</span>
                        )}
                        {!animal.autoDelete && (
                          <Badge variant="secondary" className="text-xs">
                            Manual delete
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditId(animal.id)
                            setEditSpecie(animal.specie)
                            setEditBreed(animal.breed)
                            setEditQuantity(animal.quantity.toString())
                            setEditAgeType(animal.ageType)
                            setEditAgeNumber(animal.ageNumber.toString())
                            setEditWeightType(animal.weightType)
                            setEditWeightValue(animal.weightValue.toString())
                            setEditGender(animal.gender)
                            setEditLocation(animal.location)
                            setEditHealthCertificate(animal.healthCertificate)
                            setEditTotalPrice(animal.totalPrice.toString())
                            setEditPurchasePrice(animal.purchasePrice.toString())
                            setEditReferredBy(animal.referredBy || '')
                            setEditStatus(animal.status)
                            setEditAutoDelete(animal.autoDelete)
                            setEditAnimalImagePreview(animal.images?.[0]?.url || null)
                            setOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(animal.id)}
                          disabled={isDeleting === animal.id}
                        >
                          {isDeleting === animal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {animals.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No animal listings found</p>
            </div>
          )}

          <div className="mt-4 px-4 py-2 flex justify-between items-center text-sm">
            <p className="text-muted-foreground">Total entries: {total}</p>
            <span>
              {lastCreatedAt
                ? `Last entry submitted ${formatDistanceToNow(new Date(lastCreatedAt))} ago`
                : 'No entries yet'}
            </span>
            <div className="flex gap-2">
              <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
              {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
                .slice(Math.max(0, page - 3), Math.min(Math.ceil(total / limit), page + 2))
                .map((p) => (
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Animal Listing</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Specie *</label>
                  <Input 
                    value={editSpecie} 
                    onChange={(e) => setEditSpecie(e.target.value)} 
                    placeholder="e.g., Cow, Goat, Sheep"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Breed *</label>
                  <Input 
                    value={editBreed} 
                    onChange={(e) => setEditBreed(e.target.value)}
                    placeholder="e.g., Holstein, Angus" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <Input 
                    type="number" 
                    value={editQuantity} 
                    onChange={(e) => setEditQuantity(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender *</label>
                  <Select value={editGender} onValueChange={(v) => setEditGender(v as 'MALE' | 'FEMALE')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Age *</label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={editAgeNumber} 
                      onChange={(e) => setEditAgeNumber(e.target.value)}
                      min="0"
                      className="flex-1"
                    />
                    <Select value={editAgeType} onValueChange={(v) => setEditAgeType(v as any)}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAYS">Days</SelectItem>
                        <SelectItem value="WEEKS">Weeks</SelectItem>
                        <SelectItem value="MONTHS">Months</SelectItem>
                        <SelectItem value="YEARS">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Weight *</label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={editWeightValue} 
                      onChange={(e) => setEditWeightValue(e.target.value)}
                      min="0"
                      step="0.01"
                      className="flex-1 w-2.5"
                    />
                    <Select value={editWeightType} onValueChange={(v) => setEditWeightType(v as any)}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GRAMS">Grams</SelectItem>
                        <SelectItem value="KGS">KGs</SelectItem>
                        <SelectItem value="MUNS">Muns</SelectItem>
                        <SelectItem value="TONS">Tons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location *</label>
                  <Input 
                    value={editLocation} 
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g., Lahore, Karachi"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="healthCert"
                    checked={editHealthCertificate}
                    onChange={(e) => setEditHealthCertificate(e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="healthCert" className="text-sm font-medium">
                    Health Certificate Available
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Price (PKR) *</label>
                  <Input 
                    type="number" 
                    value={editTotalPrice} 
                    onChange={(e) => setEditTotalPrice(e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Price (PKR) *</label>
                  <Input 
                    type="number" 
                    value={editPurchasePrice} 
                    onChange={(e) => setEditPurchasePrice(e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Referred By</label>
                  <Input 
                    value={editReferredBy} 
                    onChange={(e) => setEditReferredBy(e.target.value)}
                    placeholder="Optional referrer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoDelete"
                    checked={editAutoDelete}
                    onCheckedChange={setEditAutoDelete}
                  />
                  <Label htmlFor="autoDelete" className="text-sm font-medium cursor-pointer">
                    Auto-delete after 30 days
                  </Label>
                </div>
              </div>
              
              <div className="md:col-span-3 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Update Image</label>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setEditAnimalImage(file)
                      if (file) setEditAnimalImagePreview(URL.createObjectURL(file))
                    }} 
                  />
                </div>
                {editAnimalImagePreview && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Image Preview</label>
                    <Image 
                      src={editAnimalImagePreview} 
                      alt="Preview" 
                      width={200} 
                      height={200} 
                      className="rounded object-cover" 
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button 
                className="bg-green-500 hover:bg-green-600" 
                onClick={handleUpdate} 
                disabled={isUpdating || !editSpecie || !editBreed || !editQuantity || !editAgeNumber || !editWeightValue || !editLocation || !editTotalPrice || !editPurchasePrice}
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