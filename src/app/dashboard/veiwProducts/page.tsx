'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2,  Loader2, Link } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Product {
  id: number
  productName: string
  genericName: string | null
  productLink: string | null
  category: string
  subCategory: string
  subsubCategory: string
  productType: string
  companyId: number
  companyPrice: number | null
  dealerPrice: number | null
  inventory: number
  customerPrice: number
  packingUnit: string
  partnerId: number
  description: string | null
  dosage: string | null
  isFeatured: boolean
  isActive: boolean
  outofstock: boolean
  createdAt: string
  company: {
    companyName: string
  }
  partner: {
    partnerName: string
  }
  image: {
    url: string
    alt: string
    publicId: string | null
  } | null
  pdf: {
    url: string
    publicId: string | null
  } | null
}

export default function ViewProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'productName'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null)

  const [editId, setEditId] = useState<number | null>(null)
  const [editProductName, setEditProductName] = useState('')
  const [editGenericName, setEditGenericName] = useState('')
  const [editProductLink, setEditProductLink] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSubCategory, setEditSubCategory] = useState('')
  const [editSubsubCategory, setEditSubsubCategory] = useState('')
  const [editProductType, setEditProductType] = useState('')
  const [editCompanyId, setEditCompanyId] = useState(0)
  const [editCompanyPrice, setEditCompanyPrice] = useState<number | null>(null)
  const [editDealerPrice, setEditDealerPrice] = useState<number | null>(null)
  const [editCustomerPrice, setEditCustomerPrice] = useState(0)
  const [editInventory, setEditInventory] = useState(0)
  const [editPackingUnit, setEditPackingUnit] = useState('')
  const [editPartnerId, setEditPartnerId] = useState(0)
  const [editDescription, setEditDescription] = useState('')
  const [editDosage, setEditDosage] = useState('')
  const [editIsFeatured, setEditIsFeatured] = useState(false)
  const [editIsActive, setEditIsActive] = useState(false)
  const [editOutofstock, setEditOutofstock] = useState(false)
  const [editProductImage, setEditProductImage] = useState<File | null>(null)
  const [editProductImagePreview, setEditProductImagePreview] = useState<string | null>(null)
  const [editProductPdf, setEditProductPdf] = useState<File | null>(null)
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [companies, setCompanies] = useState<{id: number, companyName: string}[]>([])
  const [partners, setPartners] = useState<{id: number, partnerName: string}[]>([])

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/product', {
        params: { search, sortBy, sortOrder, page, limit },
      })
   
      setProducts(data.data)
      setTotal(data.total)
      setLastCreatedAt(data.lastSubmittedAt)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch products')
    }
  }, [search, sortBy, sortOrder, page, limit])

  const fetchCompaniesAndPartners = async () => {
    try {
      const [companiesRes, partnersRes] = await Promise.all([
        axios.get('/api/company'),
        axios.get('/api/partner')
      ])
      setCompanies(companiesRes.data.data)
      setPartners(partnersRes.data.data)
    } catch (error) {
      console.error('Failed to fetch companies or partners', error)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchCompaniesAndPartners()
  }, [fetchProducts])

  const handleUpdate = async () => {
    if (!editId) return

    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('id', editId.toString())
      formData.append('productName', editProductName)
      if (editGenericName) formData.append('genericName', editGenericName)
      if (editProductLink) formData.append('productlink', editProductLink)
      formData.append('category', editCategory)
      formData.append('subCategory', editSubCategory)
      formData.append('subsubCategory', editSubsubCategory)
      formData.append('productType', editProductType)
      formData.append('companyId', editCompanyId.toString())
      if (editCompanyPrice) formData.append('companyPrice', editCompanyPrice.toString())
      if (editDealerPrice) formData.append('dealerPrice', editDealerPrice.toString())
      formData.append('customerPrice', editCustomerPrice.toString())
      formData.append('inventory', editInventory.toString())
      formData.append('packingUnit', editPackingUnit)
      formData.append('partnerId', editPartnerId.toString())
      if (editDescription) formData.append('description', editDescription)
      if (editDosage) formData.append('dosage', editDosage)
      formData.append('isFeatured', String(editIsFeatured))
      formData.append('isActive', String(editIsActive))
      formData.append('outofstock', String(editOutofstock))
      if (editProductImage) formData.append('image', editProductImage)
      if (editProductPdf) formData.append('pdf', editProductPdf)

      await axios.put('/api/product', formData)
      toast.success('Product updated')
      setOpen(false)
      fetchProducts()
    } catch {
      toast.error('Failed to update product')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    setIsDeleting(id)
    try {
      await axios.delete('/api/product', { params: { id } })
      toast.error('Product deleted')
      fetchProducts()
    } catch {
      toast.error('Failed to delete product')
    } finally {
      setIsDeleting(null)
    }
  }

 const handleSortChange = (value: string) => {
  const [sortBy, sortOrder] = value.split('-')
  setSortBy(sortBy as 'id' | 'productName')
  setSortOrder(sortOrder as 'asc' | 'desc')
}

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">Products</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex gap-2 items-center">
  <Input
    placeholder="Search products..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="focus:ring-green-500"
  />
  <Select 
    value={`${sortBy}-${sortOrder}`}
    onValueChange={handleSortChange}
  >
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Sort by" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="id-asc">ID (Ascending)</SelectItem>
      <SelectItem value="id-desc">ID (Descending)</SelectItem>
      <SelectItem value="productName-asc">Name (A-Z)</SelectItem>
      <SelectItem value="productName-desc">Name (Z-A)</SelectItem>
    </SelectContent>
  </Select>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{product.productName}</h3>
                {product.genericName && <p className="text-sm text-muted-foreground">{product.genericName}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditId(product.id)
                    setEditProductName(product.productName)
                    setEditGenericName(product.genericName || '')
                    setEditProductLink(product.productLink || '')
                    setEditCategory(product.category)
                    setEditSubCategory(product.subCategory)
                    setEditSubsubCategory(product.subsubCategory)
                    setEditProductType(product.productType)
                    setEditCompanyId(product.companyId)
                    setEditCompanyPrice(product.companyPrice)
                    setEditDealerPrice(product.dealerPrice)
                    setEditCustomerPrice(product.customerPrice)
                    setEditInventory(product.inventory)
                    setEditPackingUnit(product.packingUnit)
                    setEditPartnerId(product.partnerId)
                    setEditDescription(product.description || '')
                    setEditDosage(product.dosage || '')
                    setEditIsFeatured(product.isFeatured)
                    setEditIsActive(product.isActive)
                    setEditOutofstock(product.outofstock)
                    setEditProductImagePreview(product.image?.url || null)
                    setOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(product.id)}
                  disabled={isDeleting === product.id}
                >
                  {isDeleting === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {product.image && (
              <div className="relative aspect-square w-full">
                <Image
                  src={product.image.url}
                  alt={product.image.alt}
                  fill
                  className="rounded object-cover"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Badge variant={product.isFeatured ? 'default' : 'secondary'} className={product.isFeatured ? 'bg-green-500' : ''}>
                {product.isFeatured ? 'Featured' : 'Not Featured'}
              </Badge>
              <Badge variant={product.isActive ? 'default' : 'destructive'} className={product.isActive ? 'bg-green-500' : ''}>
                {product.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={product.outofstock ? 'default' : 'destructive'} className={product.outofstock ? 'bg-green-500' : ''}>
                {product.outofstock ? 'In stock' : 'Out of stock'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Category:</span> {product.category}
              </div>
              <div>
                <span className="font-medium">Sub-Category:</span> {product.subCategory}
              </div>
              <div>
                <span className="font-medium">Type:</span> {product.productType}
              </div>
              <div>
                <span className="font-medium">Packing:</span> {product.packingUnit}
              </div>
              <div>
                <span className="font-medium">Company:</span> {product.company?.companyName}
              </div>
              <div>
                <span className="font-medium">Partner:</span> {product.partner?.partnerName}
              </div>
              <div >
                <a href={product.productLink ?? undefined} target="_blank"
                rel="noopener noreferrer">
               <Link/>  {product.productLink && <p className="text-sm text-blue-500 ">Check product link</p>}
             </a>
              </div>
            </div>
          

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="font-medium">Company Price:</span>PKR {product.companyPrice || '-'}
              </div>
              <div>
                <span className="font-medium">Dealer Price:</span>PKR {product.dealerPrice || '-'}
              </div>
              <div>
                <span className="font-medium">Customer Price:</span> PKR {product.customerPrice}
              </div>
              <div>
                <span className="font-medium">Inventory:</span>  {product.inventory}
              </div>
            </div>

            {product.description && (
              <div className="text-sm">
                <span className="font-medium">Description:</span> {product.description}
              </div>
            )}

            {product.dosage && (
              <div className="text-sm">
                <span className="font-medium">Dosage:</span> {product.dosage}
              </div>
            )}

            {product.pdf && (
              <div className="pt-2">
                <a 
                  href={product.pdf.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-green-500 hover:underline"
                >
                  View Product PDF
                </a>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Created {formatDistanceToNow(new Date(product.createdAt))} ago
            </div>
          </div>
        ))}
      </div>

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Product Name*</Label>
                <Input 
                  value={editProductName} 
                  onChange={(e) => setEditProductName(e.target.value)} 
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label>Generic Name</Label>
                <Input 
                  value={editGenericName} 
                  onChange={(e) => setEditGenericName(e.target.value)} 
                  placeholder="Enter generic name"
                />
              </div>
              <div>
                <Label>Category*</Label>
                <Input 
                  value={editCategory} 
                  onChange={(e) => setEditCategory(e.target.value)} 
                  placeholder="Enter category"
                />
              </div>
              <div>
                <Label>Sub-Category*</Label>
                <Input 
                  value={editSubCategory} 
                  onChange={(e) => setEditSubCategory(e.target.value)} 
                  placeholder="Enter sub-category"
                />
              </div>
              <div>
                <Label>Sub-Sub-Category*</Label>
                <Input 
                  value={editSubsubCategory} 
                  onChange={(e) => setEditSubsubCategory(e.target.value)} 
                  placeholder="Enter sub-sub-category"
                />
              </div>
              <div>
                <Label>Product Type*</Label>
                <Input 
                  value={editProductType} 
                  onChange={(e) => setEditProductType(e.target.value)} 
                  placeholder="Enter product type"
                />
              </div>
              <div>
                <Label>Company*</Label>
                <Select 
                  value={String(editCompanyId)} 
                  onValueChange={(v) => setEditCompanyId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={String(company.id)}>
                        {company.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Partner*</Label>
                <Select 
                  value={String(editPartnerId)} 
                  onValueChange={(v) => setEditPartnerId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={String(partner.id)}>
                        {partner.partnerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Company Price</Label>
                <Input 
                  type="number" 
                  value={editCompanyPrice || ''} 
                  onChange={(e) => setEditCompanyPrice(e.target.value ? Number(e.target.value) : null)} 
                  placeholder="Enter company price"
                />
              </div>
              <div>
                <Label>Dealer Price</Label>
                <Input 
                  type="number" 
                  value={editDealerPrice || ''} 
                  onChange={(e) => setEditDealerPrice(e.target.value ? Number(e.target.value) : null)} 
                  placeholder="Enter dealer price"
                />
              </div>
              <div>
                <Label>Customer Price*</Label>
                <Input 
                  type="number" 
                  value={editCustomerPrice} 
                  onChange={(e) => setEditCustomerPrice(Number(e.target.value))} 
                  placeholder="Enter customer price"
                />
              </div>
              <div>
                <Label>Packing Unit*</Label>
                <Input 
                  value={editPackingUnit} 
                  onChange={(e) => setEditPackingUnit(e.target.value)} 
                  placeholder="Enter packing unit"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Label>Featured</Label>
                  <Switch 
                    checked={editIsFeatured} 
                    onCheckedChange={setEditIsFeatured} 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Label>Active</Label>
                  <Switch 
                    checked={editIsActive} 
                    onCheckedChange={setEditIsActive} 
                  />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)} 
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
              <div>
                <Label>Dosage</Label>
                <Textarea 
                  value={editDosage} 
                  onChange={(e) => setEditDosage(e.target.value)} 
                  placeholder="Enter dosage information"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Product Image</Label>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setEditProductImage(file)
                      if (file) setEditProductImagePreview(URL.createObjectURL(file))
                    }} 
                  />
                  {editProductImagePreview && (
                    <div className="mt-2 relative aspect-square w-32">
                      <Image 
                        src={editProductImagePreview} 
                        alt="Preview" 
                        fill 
                        className="rounded object-cover"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label>Product PDF</Label>
                  <Input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setEditProductPdf(file)
                    }} 
                  />
                </div>
              </div>
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
  )
}