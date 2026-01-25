'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Pencil, Trash2, Search, RefreshCw, Building2 } from 'lucide-react'

interface Company {
  id: number
  companyName: string | null
  image: { url: string } | null
}

interface Product {
  id: number
  productName: string
  image: { url: string } | null
  variants: { id: number; packingVolume: string; customerPrice: number }[]
}

interface Discount {
  id: number
  name: string
  description: string | null
  percentage: number
  startDate: string
  endDate: string
  isActive: boolean
  companyId: number | null
  productId: number | null
  variantId: number | null
  company: {
    id: number
    companyName: string | null
    image: { url: string } | null
  } | null
  product: {
    id: number
    productName: string
    image: { url: string } | null
  } | null
  variant: {
    id: number
    packingVolume: string
    customerPrice: number
    product: {
      id: number
      productName: string
      image: { url: string } | null
    }
  } | null
}

interface DiscountFormData {
  name: string
  description: string
  percentage: number
  startDate: string
  endDate: string
  isActive: boolean
  companyId: number | null
  productIds: number[]
  variantId: number | null
  applyToAllCompanyProducts: boolean
}

const initialFormData: DiscountFormData = {
  name: '',
  description: '',
  percentage: 10,
  startDate: '',
  endDate: '',
  isActive: true,
  companyId: null,
  productIds: [],
  variantId: null,
  applyToAllCompanyProducts: false,
}

export default function DiscountProductsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyProducts, setCompanyProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Pagination & Filters
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [formData, setFormData] = useState<DiscountFormData>(initialFormData)
  const [selectedVariantProductId, setSelectedVariantProductId] = useState<number | null>(null)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const fetchDiscounts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/discounts', {
        params: {
          page,
          limit: 10,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          companyId: companyFilter !== 'all' ? companyFilter : undefined,
          search: searchQuery || undefined,
        },
      })
      setDiscounts(data.data)
      setTotalPages(data.totalPages)
    } catch (error) {
      toast.error('Failed to fetch discounts')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, companyFilter, searchQuery])

  const fetchCompanies = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/company')
      setCompanies(data.data || data || [])
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }, [])

  const fetchCompanyProducts = useCallback(async (companyId: number) => {
    setLoadingProducts(true)
    try {
      const { data } = await axios.get('/api/product', {
        params: { companyId, limit: 100 },
      })
      // Filter products by companyId client-side if API doesn't support it
      const filtered = (data.data || []).filter((p: any) => p.companyId === companyId)
      setCompanyProducts(filtered.length > 0 ? filtered : data.data || [])
    } catch (error) {
      console.error('Failed to fetch company products:', error)
      setCompanyProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  useEffect(() => {
    fetchDiscounts()
  }, [fetchDiscounts])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Fetch products when company is selected in form
  useEffect(() => {
    if (formData.companyId) {
      fetchCompanyProducts(formData.companyId)
    } else {
      setCompanyProducts([])
    }
  }, [formData.companyId, fetchCompanyProducts])

  const getDiscountStatus = (discount: Discount) => {
    if (!discount.isActive) return 'disabled'
    const now = new Date()
    const start = new Date(discount.startDate)
    const end = new Date(discount.endDate)
    if (now < start) return 'scheduled'
    if (now > end) return 'expired'
    return 'active'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Scheduled</Badge>
      case 'expired':
        return <Badge className="bg-gray-500 hover:bg-gray-600">Expired</Badge>
      case 'disabled':
        return <Badge variant="outline">Disabled</Badge>
      default:
        return null
    }
  }

  const getDiscountScope = (discount: Discount) => {
    if (discount.company) {
      return (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-500" />
          <span className="text-blue-600 font-medium">All: {discount.company.companyName}</span>
        </div>
      )
    }
    if (discount.variant) {
      return (
        <div>
          <div className="font-medium">{discount.variant.product.productName}</div>
          <div className="text-sm text-gray-500">{discount.variant.packingVolume}</div>
        </div>
      )
    }
    if (discount.product) {
      return <span>{discount.product.productName}</span>
    }
    return <span className="text-gray-400">N/A</span>
  }

  const openCreateModal = () => {
    setEditingDiscount(null)
    setFormData(initialFormData)
    setCompanyProducts([])
    setSelectedVariantProductId(null)
    setIsModalOpen(true)
  }

  const openEditModal = (discount: Discount) => {
    setEditingDiscount(discount)

    const companyId = discount.companyId || discount.product?.id ?
      (discount.variant?.product ? null : null) : null

    setFormData({
      name: discount.name,
      description: discount.description || '',
      percentage: discount.percentage,
      startDate: new Date(discount.startDate).toISOString().slice(0, 16),
      endDate: new Date(discount.endDate).toISOString().slice(0, 16),
      isActive: discount.isActive,
      companyId: discount.companyId,
      productIds: discount.productId ? [discount.productId] : [],
      variantId: discount.variantId,
      applyToAllCompanyProducts: !!discount.companyId,
    })

    if (discount.variantId && discount.variant?.product) {
      setSelectedVariantProductId(discount.variant.product.id)
    }

    setIsModalOpen(true)
  }

  const handleCompanyChange = (companyId: string) => {
    const id = companyId === 'none' ? null : parseInt(companyId)
    setFormData(prev => ({
      ...prev,
      companyId: id,
      productIds: [],
      variantId: null,
      applyToAllCompanyProducts: false,
    }))
    setSelectedVariantProductId(null)
  }

  const handleProductToggle = (productId: number) => {
    setFormData(prev => {
      const isSelected = prev.productIds.includes(productId)
      return {
        ...prev,
        productIds: isSelected
          ? prev.productIds.filter(id => id !== productId)
          : [...prev.productIds, productId],
        applyToAllCompanyProducts: false,
      }
    })
  }

  const handleSelectAllProducts = () => {
    if (formData.productIds.length === companyProducts.length) {
      setFormData(prev => ({ ...prev, productIds: [] }))
    } else {
      setFormData(prev => ({ ...prev, productIds: companyProducts.map(p => p.id) }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        ...formData,
        productIds: formData.applyToAllCompanyProducts ? [] : formData.productIds,
      }

      if (editingDiscount) {
        // For edit, we update the single discount
        await axios.put(`/api/discounts/${editingDiscount.id}`, {
          name: formData.name,
          description: formData.description,
          percentage: formData.percentage,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive,
        })
        toast.success('Discount updated successfully')
      } else {
        await axios.post('/api/discounts', payload)
        toast.success('Discount(s) created successfully')
      }

      setIsModalOpen(false)
      fetchDiscounts()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save discount')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (discount: Discount) => {
    try {
      await axios.patch(`/api/discounts/${discount.id}`)
      toast.success(`Discount ${discount.isActive ? 'disabled' : 'enabled'}`)
      fetchDiscounts()
    } catch (error) {
      toast.error('Failed to update discount')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await axios.delete(`/api/discounts/${deleteId}`)
      toast.success('Discount deleted successfully')
      setIsDeleteModalOpen(false)
      setDeleteId(null)
      fetchDiscounts()
    } catch (error) {
      toast.error('Failed to delete discount')
    }
  }

  const confirmDelete = (id: number) => {
    setDeleteId(id)
    setIsDeleteModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const selectedVariantProduct = companyProducts.find(p => p.id === selectedVariantProductId)

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Discount Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage product discounts and promotions
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-green-600 hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" /> Add Discount
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search discounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchDiscounts()}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id.toString()}>
                {company.companyName || `Company ${company.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchDiscounts()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Discounts Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Applied To</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No discounts found
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => {
                const status = getDiscountStatus(discount)

                return (
                  <TableRow key={discount.id}>
                    <TableCell className="font-medium">{discount.name}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        {getDiscountScope(discount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                        {discount.percentage}% OFF
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(discount.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(discount.endDate)}</TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Switch
                          checked={discount.isActive}
                          onCheckedChange={() => handleToggleActive(discount)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(discount)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => confirmDelete(discount.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
            </DialogTitle>
            <DialogDescription>
              {editingDiscount
                ? 'Update the discount details below.'
                : 'Select a company first, then choose products to apply discount.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Discount Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Sale"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the discount"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentage">Discount Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="percentage"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={formData.percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>

              {!editingDiscount && (
                <>
                  {/* Company Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="company">Select Company</Label>
                    <Select
                      value={formData.companyId?.toString() || 'none'}
                      onValueChange={handleCompanyChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company first" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Select Company --</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.companyName || `Company ${company.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Products Selection */}
                  {formData.companyId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Select Products</Label>
                        {companyProducts.length > 0 && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="applyAll"
                                checked={formData.applyToAllCompanyProducts}
                                onCheckedChange={(checked) => setFormData(prev => ({
                                  ...prev,
                                  applyToAllCompanyProducts: !!checked,
                                  productIds: [],
                                }))}
                              />
                              <Label htmlFor="applyAll" className="text-sm text-blue-600 cursor-pointer">
                                Apply to ALL company products
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>

                      {loadingProducts ? (
                        <div className="text-center py-4 text-gray-500">Loading products...</div>
                      ) : companyProducts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">No products found for this company</div>
                      ) : !formData.applyToAllCompanyProducts && (
                        <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Checkbox
                              id="selectAll"
                              checked={formData.productIds.length === companyProducts.length}
                              onCheckedChange={handleSelectAllProducts}
                            />
                            <Label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">
                              Select All ({companyProducts.length} products)
                            </Label>
                          </div>
                          {companyProducts.map((product) => (
                            <div key={product.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`product-${product.id}`}
                                checked={formData.productIds.includes(product.id)}
                                onCheckedChange={() => handleProductToggle(product.id)}
                              />
                              <Label htmlFor={`product-${product.id}`} className="text-sm cursor-pointer flex-1">
                                {product.productName}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {formData.productIds.length > 0 && (
                        <p className="text-sm text-green-600">
                          {formData.productIds.length} product(s) selected
                        </p>
                      )}
                      {formData.applyToAllCompanyProducts && (
                        <p className="text-sm text-blue-600">
                          Discount will apply to all {companyProducts.length} products of this company
                        </p>
                      )}
                    </div>
                  )}

                  {/* Variant Selection (optional - for single product) */}
                  {formData.productIds.length === 1 && !formData.applyToAllCompanyProducts && (
                    <div className="space-y-2">
                      <Label>Apply to specific variant? (Optional)</Label>
                      {(() => {
                        const product = companyProducts.find(p => p.id === formData.productIds[0])
                        if (!product || product.variants.length === 0) return null
                        return (
                          <Select
                            value={formData.variantId?.toString() || 'all'}
                            onValueChange={(v) => setFormData(prev => ({
                              ...prev,
                              variantId: v === 'all' ? null : parseInt(v)
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All variants" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All variants</SelectItem>
                              {product.variants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id.toString()}>
                                  {variant.packingVolume} - PKR {variant.customerPrice?.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      })()}
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={submitting || (!editingDiscount && !formData.companyId)}
              >
                {submitting ? 'Saving...' : editingDiscount ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Discount</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this discount? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
