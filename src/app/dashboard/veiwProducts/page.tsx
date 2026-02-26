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
import { Pencil, Trash2, Loader2, Link, Plus, X, Eye, Search } from 'lucide-react'
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
import { SuggestiveInput } from '@/components/shared/SuggestiveInput'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { useCountry } from '@/contexts/CountryContext'

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
  const { country } = useCountry()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
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
  const [editCompanyId, setEditCompanyId] = useState('')
  const [editPartnerId, setEditPartnerId] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDosage, setEditDosage] = useState('')
  const [editIsFeatured, setEditIsFeatured] = useState(false)
  const [editIsActive, setEditIsActive] = useState(false)
  const [editOutofstock, setEditOutofstock] = useState(false)
  const [editProductImage, setEditProductImage] = useState<File | null>(null)
  const [editProductImagePreview, setEditProductImagePreview] = useState<string | null>(null)
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editProductPdf, setEditProductPdf] = useState<File | null>(null)
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([])
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [companies, setCompanies] = useState<{id: number, companyName: string}[]>([])
  const [partners, setPartners] = useState<{id: number, partnerName: string}[]>([])

  const fetchProducts = useCallback(async () => {
    try {
      const params: any = { search, sortBy, sortOrder, page, limit, includeVariants: true, country }
      if (minPrice) params.minPrice = parseFloat(minPrice)
      if (maxPrice) params.maxPrice = parseFloat(maxPrice)

      const { data } = await axios.get('/api/product', {
        params,
      })

      setProducts(data.data)
      setTotal(data.total)
      setLastCreatedAt(data.lastSubmittedAt)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch products')
    }
  }, [search, sortBy, sortOrder, page, limit, minPrice, maxPrice, country])

  const fetchCompaniesAndPartners = useCallback(async () => {
    try {
      const [companiesRes, partnersRes] = await Promise.all([
        axios.get(`/api/company?limit=all&country=${country}`),
        axios.get(`/api/partner?limit=all&country=${country}`)
      ])
      setCompanies(companiesRes.data.data || [])
      setPartners(partnersRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch companies or partners', error)
    }
  }, [country])

  useEffect(() => {
    fetchProducts()
    fetchCompaniesAndPartners()
  }, [fetchProducts, fetchCompaniesAndPartners])

  const handleUpdate = async () => {
    if (!editId) return

    setIsUpdating(true)
    try {
      const formData = new FormData()
      
      // Add all the regular fields
      formData.append('productName', editProductName)
      if (editGenericName) formData.append('genericName', editGenericName)
      if (editProductLink) formData.append('productLink', editProductLink)
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
      
      // Add variants properly
      editVariants.forEach((variant, i) => {
        formData.append(`variants[${i}][packingVolume]`, variant.packingVolume)
        if (variant.companyPrice !== null && variant.companyPrice !== undefined) {
          formData.append(`variants[${i}][companyPrice]`, variant.companyPrice.toString())
        }
        if (variant.dealerPrice !== null && variant.dealerPrice !== undefined) {
          formData.append(`variants[${i}][dealerPrice]`, variant.dealerPrice.toString())
        }
        formData.append(`variants[${i}][customerPrice]`, variant.customerPrice.toString())
        formData.append(`variants[${i}][inventory]`, variant.inventory.toString())
      })
      
      // Add files if they exist
      if (editProductImage) {
        formData.append('image', editProductImage)
      }
      if (editImageUrl) {
        formData.append('imageUrl', editImageUrl)
      }
      if (editProductPdf) {
        formData.append('pdf', editProductPdf)
      }

      const response = await axios.put(`/api/product?id=${editId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.success('Product updated')
      setOpen(false)
      fetchProducts()
    } catch (error) {
      console.error('Update error:', error)
      if (axios.isAxiosError(error) && error.response) {
        console.error('Error response:', error.response.data)
        toast.error(error.response.data.error || 'Failed to update product')
      } else {
        toast.error('Failed to update product')
      }
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

  const handleSearch = () => {
    setSearch(searchTerm)
    setPage(1) // Reset to first page when searching
  }

  const handlePriceFilter = () => {
    setPage(1) // Reset to first page when filtering
    fetchProducts()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
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

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
  <div className="flex flex-col sm:flex-row gap-2 flex-wrap w-full sm:w-auto">
    <div className="flex gap-1 w-full sm:w-auto">
      <Input
        placeholder="Search products..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={handleKeyPress}
        className="focus:ring-green-500 w-full"
      />
      <Button
        onClick={handleSearch}
        size="sm"
        className="bg-green-500 hover:bg-green-600 px-3"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
    <div className="flex gap-1 w-full sm:w-auto">
      <Input
        type="number"
        placeholder="Min price"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        className="focus:ring-green-500 w-full sm:w-[120px]"
      />
      <Input
        type="number"
        placeholder="Max price"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        className="focus:ring-green-500 w-full sm:w-[120px]"
      />
      <Button
        onClick={handlePriceFilter}
        size="sm"
        className="bg-blue-500 hover:bg-blue-600 px-3"
      >
        Filter
      </Button>
    </div>
    <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="id-asc">ID (Asc)</SelectItem>
        <SelectItem value="id-desc">ID (Desc)</SelectItem>
        <SelectItem value="productName-asc">Name (A-Z)</SelectItem>
        <SelectItem value="productName-desc">Name (Z-A)</SelectItem>
      </SelectContent>
    </Select>
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
                        setEditCompanyId(product.companyId.toString())
                        setEditPartnerId(product.partnerId.toString())
                        setEditDescription(product.description || '')
                        setEditDosage(product.dosage || '')
                        setEditIsFeatured(product.isFeatured)
                        setEditIsActive(product.isActive)
                        setEditOutofstock(product.outofstock)
                        setEditProductImagePreview(product.image?.url || null)
                        setEditImageUrl(product.image?.url || '')
                        setEditVariants(product.variants.map(v => ({
                          id: v.id,
                          packingVolume: v.packingVolume,
                          companyPrice: v.companyPrice,
                          dealerPrice: v.dealerPrice,
                          customerPrice: v.customerPrice,
                          inventory: v.inventory
                        })))
                        setEditProductImage(null)
                        setEditProductPdf(null)
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
   <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4">
  <p className="text-sm text-muted-foreground">
    Total entries: {total} | Page {page} of {totalPages}
  </p>

  <div className="flex items-center gap-2 flex-wrap">
    <Button size="sm" variant="outline" onClick={() => setPage(1)} disabled={page === 1}>First</Button>
    <Button size="sm" variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</Button>
    
    {[...Array(totalPages)].slice(Math.max(0, page - 2), page + 1).map((_, i) => {
      const pageNum = i + Math.max(1, page - 2)
      return (
        <Button
          key={pageNum}
          size="sm"
          variant={page === pageNum ? "default" : "outline"}
          onClick={() => setPage(pageNum)}
        >
          {pageNum}
        </Button>
      )
    })}
    
    <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next</Button>
    <Button size="sm" variant="outline" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last</Button>
  </div>
</div>


      <Dialog open={open} onOpenChange={(newOpen) => {
  setOpen(newOpen)
  if (!newOpen) {
    setEditProductImage(null)
    setEditProductPdf(null)
    setEditProductImagePreview(null)
    setEditImageUrl('')
  }
}}>
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
                <SuggestiveInput
                  suggestions={[
                    "Veterinary",
                    "Poultry",
                    "Pets",
                    "Equine",
                    "Livestock Feed",
                    "Poultry Feed",
                    "Instruments & Equipment",
                    "Fisheries & Aquaculture",
                    "Vaccination Services / Kits",
                    "Herbal / Organic Products",
                  ]}
                  value={editCategory}
                  onChange={(v) => setEditCategory(v)}
                  placeholder="Enter category"
                />
              </div>

              <div>
                <Label>Sub-Category*</Label>
                <SuggestiveInput
                  suggestions={[
                    "Antiparasitics",
                    "Antibiotics & Antibacterials",
                    "Vaccines & Immunologicals",
                    "Nutritional Supplements",
                    "Growth Promoters",
                    "Coccidiostats",
                    "Pain Management / NSAIDs",
                    "Reproductive Health / Hormones",
                    "Liver & Kidney Tonics",
                    "Respiratory Health / Expectorants",
                  ]}
                  value={editSubCategory}
                  onChange={(v) => setEditSubCategory(v)}
                  placeholder="Enter sub-category"
                />
              </div>

              <div>
                <Label>Sub-Sub-Category*</Label>
                <SuggestiveInput
                  suggestions={[
                    "Endoparasiticides (e.g., dewormers)",
                    "Ectoparasiticides (e.g., tick/flea/mite treatment)",
                    "Broad-Spectrum Dewormers",
                    "Multivitamins & Trace Elements",
                    "Electrolytes & Hydration Solutions",
                    "Mineral Mixtures / Salt Licks",
                    "Probiotics & Enzymes",
                    "Calcium / Phosphorus Supplements",
                    "Immuno-Stimulants",
                    "Hepato-Renal Protectants",
                  ]}
                  value={editSubsubCategory}
                  onChange={(v) => setEditSubsubCategory(v)}
                  placeholder="Enter sub-sub-category"
                />
              </div>

              <div>
                <Label>Product Type*</Label>
                <SuggestiveInput
                  suggestions={[
                    "Injection (IV, IM, SC)",
                    "Tablet / Bolus / Pill",
                    "Oral Powder / Sachet",
                    "Oral Suspension / Syrup",
                    "Spray / Aerosol",
                    "Oral Solution / Drops",
                    "Topical Application / Pour-on / Spot-on",
                    "Premix (for feed inclusion)",
                    "Intrauterine / Intra-mammary",
                    "Transdermal Patch / Ointment / Cream"
                  ]}
                  value={editProductType}
                  onChange={(v) => setEditProductType(v)}
                  placeholder="Enter product type"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Company*</Label>
                <ComboboxSelect
                  options={companies.map((company) => ({
                    id: company.id,
                    label: company.companyName,
                  }))}
                  value={editCompanyId}
                  onChange={setEditCompanyId}
                  placeholder="Select company"
                />
              </div>

              <div>
                <Label>Partner*</Label>
                <ComboboxSelect
                  options={partners.map((partner) => ({
                    id: partner.id,
                    label: partner.partnerName,
                  }))}
                  value={editPartnerId}
                  onChange={setEditPartnerId}
                  placeholder="Select partner"
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
                        {editVariants.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVariant(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
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
                          <Label>Our Price*</Label>
                          <Input
                            type="number"
                            placeholder="Our price"
                            value={variant.customerPrice}
                            onChange={(e) => handleVariantChange(index, 'customerPrice', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Retail Price</Label>
                          <Input
                            type="number"
                            placeholder="Retail Price"
                            value={variant.companyPrice || ''}
                            onChange={(e) => handleVariantChange(index, 'companyPrice', e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>
                        <div>
                          <Label>Purchase Price</Label>
                          <Input
                            type="number"
                            placeholder="Purchase price"
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
              
              <div>
                <Label>Image URL</Label>
                <Input
                  value={editImageUrl}
                  onChange={(e) => {
                    setEditImageUrl(e.target.value)
                    setEditProductImagePreview(e.target.value || null)
                  }}
                  placeholder="Enter image URL (or upload a file below)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Product Image (Upload to replace)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setEditProductImage(file)
                      if (file) {
                        setEditProductImagePreview(URL.createObjectURL(file))
                        setEditImageUrl('')
                      }
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