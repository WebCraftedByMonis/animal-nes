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
import { Pencil, Trash2, Loader2, Link, Plus, X, Eye } from 'lucide-react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ProductVariant {
  id?: number
  packingVolume: string
  companyPrice: number | null
  dealerPrice: number | null
  customerPrice: number
  inventory: number
}

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
  variants: ProductVariant[]
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
  const [editPartnerId, setEditPartnerId] = useState(0)
  const [editDescription, setEditDescription] = useState('')
  const [editDosage, setEditDosage] = useState('')
  const [editIsFeatured, setEditIsFeatured] = useState(false)
  const [editIsActive, setEditIsActive] = useState(false)
  const [editOutofstock, setEditOutofstock] = useState(false)
  const [editProductImage, setEditProductImage] = useState<File | null>(null)
  const [editProductImagePreview, setEditProductImagePreview] = useState<string | null>(null)
  const [editProductPdf, setEditProductPdf] = useState<File | null>(null)
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([])
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [companies, setCompanies] = useState<{id: number, companyName: string}[]>([])
  const [partners, setPartners] = useState<{id: number, partnerName: string}[]>([])

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/product', {
        params: { search, sortBy, sortOrder, page, limit, includeVariants: true },
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
      formData.append('partnerId', editPartnerId.toString())
      if (editDescription) formData.append('description', editDescription)
      if (editDosage) formData.append('dosage', editDosage)
      formData.append('isFeatured', String(editIsFeatured))
      formData.append('isActive', String(editIsActive))
      formData.append('outofstock', String(editOutofstock))
      formData.append('variants', JSON.stringify(editVariants))
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
      toast.success('Product deleted')
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

  const handleAddVariant = () => {
    setEditVariants([...editVariants, {
      packingVolume: '',
      companyPrice: null,
      dealerPrice: null,
      customerPrice: 0,
      inventory: 0
    }])
  }

  const handleRemoveVariant = (index: number) => {
    setEditVariants(editVariants.filter((_, i) => i !== index))
  }

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number | null) => {
    const newVariants = [...editVariants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setEditVariants(newVariants)
  }

  const totalPages = Math.ceil(total / limit)

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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">ID</TableHead>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.id}</TableCell>
                <TableCell>
                  {product.image ? (
                    <div className="relative w-16 h-16">
                      <Image
                        src={product.image.url}
                        alt={product.image.alt}
                        fill
                        className="rounded object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                      No image
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{product.productName}</p>
                    {product.genericName && (
                      <p className="text-sm text-muted-foreground">{product.genericName}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{product.category}</p>
                    <p className="text-muted-foreground">{product.subCategory}</p>
                  </div>
                </TableCell>
                <TableCell>{product.company?.companyName}</TableCell>
                <TableCell>{product.partner?.partnerName}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {product.variants && product.variants.length > 0 ? (
                      product.variants.map((variant, index) => (
                        <div key={variant.id || index} className="text-sm">
                          <span className="font-medium">{variant.packingVolume}</span>
                          <span className="text-muted-foreground ml-2">
                            PKR {variant.customerPrice} | Stock: {variant.inventory}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No variants</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={product.isActive ? 'default' : 'destructive'} className={product.isActive ? 'bg-green-500' : ''}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant={!product.outofstock ? 'default' : 'destructive'} className={!product.outofstock ? 'bg-green-500' : ''}>
                      {!product.outofstock ? 'In stock' : 'Out of stock'}
                    </Badge>
                    {product.isFeatured && (
                      <Badge className="bg-blue-500">Featured</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(product.createdAt))} ago
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    {product.productLink && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={product.productLink} target="_blank" rel="noopener noreferrer">
                          <Link className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {product.pdf && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={product.pdf.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
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
                        setEditPartnerId(product.partnerId)
                        setEditDescription(product.description || '')
                        setEditDosage(product.dosage || '')
                        setEditIsFeatured(product.isFeatured)
                        setEditIsActive(product.isActive)
                        setEditOutofstock(product.outofstock)
                        setEditProductImagePreview(product.image?.url || null)
                        setEditVariants(product.variants.map(v => ({
                          id: v.id,
                          packingVolume: v.packingVolume,
                          companyPrice: v.companyPrice,
                          dealerPrice: v.dealerPrice,
                          customerPrice: v.customerPrice,
                          inventory: v.inventory
                        })))
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Total entries: {total} | {lastCreatedAt && `Last entry: ${formatDistanceToNow(new Date(lastCreatedAt))} ago`}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page === totalPages}
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
                <Label>Product Link</Label>
                <Input 
                  value={editProductLink} 
                  onChange={(e) => setEditProductLink(e.target.value)} 
                  placeholder="Enter product link"
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
            </div>
            
            <div className="space-y-4">
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
                <div className="flex items-center space-x-2">
                  <Label>Out of Stock</Label>
                  <Switch 
                    checked={editOutofstock} 
                    onCheckedChange={setEditOutofstock} 
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Variants</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
                    <Plus className="h-4 w-4 mr-1" /> Add Variant
                  </Button>
                </div>
                <div className="space-y-4">
                  {editVariants.map((variant, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Variant {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariant(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Packing Volume*</Label>
                          <Input
                            placeholder="e.g., 500ml, 1L"
                            value={variant.packingVolume}
                            onChange={(e) => handleVariantChange(index, 'packingVolume', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Customer Price*</Label>
                          <Input
                            type="number"
                            placeholder="Customer price"
                            value={variant.customerPrice}
                            onChange={(e) => handleVariantChange(index, 'customerPrice', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Company Price</Label>
                          <Input
                            type="number"
                            placeholder="Company price"
                            value={variant.companyPrice || ''}
                            onChange={(e) => handleVariantChange(index, 'companyPrice', e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>
                        <div>
                          <Label>Dealer Price</Label>
                          <Input
                            type="number"
                            placeholder="Dealer price"
                            value={variant.dealerPrice || ''}
                            onChange={(e) => handleVariantChange(index, 'dealerPrice', e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>
                        <div>
                          <Label>Inventory*</Label>
                          <Input
                            type="number"
                            placeholder="Stock quantity"
                            value={variant.inventory}
                            onChange={(e) => handleVariantChange(index, 'inventory', Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editVariants.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No variants added. Click "Add Variant" to create one.
                    </p>
                  )}
                </div>
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