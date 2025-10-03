'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, DollarSign, Package, Building, Users, TrendingUp, Calculator } from 'lucide-react'
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect'

interface ProductVariant {
  id: number
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
  category: string
  subCategory: string
  subsubCategory: string
  productType: string
  companyId: number
  partnerId: number
  company: {
    id: number
    companyName: string
  }
  partner: {
    id: number
    partnerName: string
  }
  variants: ProductVariant[]
  image: {
    url: string
    alt: string
  } | null
}


interface PriceStats {
  totalProducts: number
  totalVariants: number
  avgCompanyPrice: number
  avgDealerPrice: number
  avgCustomerPrice: number
  priceRanges: {
    companyPrice: { min: number; max: number }
    dealerPrice: { min: number; max: number }
    customerPrice: { min: number; max: number }
  }
}

export default function PriceManagementPage() {
  // State for selection
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([])
  const [selectedPartners, setSelectedPartners] = useState<number[]>([])
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [updateAllProducts, setUpdateAllProducts] = useState(false)

  // State for data
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([]) // For product selection
  const [stats, setStats] = useState<PriceStats | null>(null)

  // State for price update
  const [priceType, setPriceType] = useState<'companyPrice' | 'dealerPrice' | 'customerPrice'>('customerPrice')
  const [updateType, setUpdateType] = useState<'exact' | 'percentage' | 'addition' | 'subtraction'>('exact')
  const [updateValue, setUpdateValue] = useState<string>('')

  // State for UI
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Fetch all products for selection dropdown
  const fetchAllProducts = useCallback(async () => {
    try {
      // Get products from selected companies and partners for the dropdown
      const params = new URLSearchParams()
      if (selectedCompanies.length > 0) {
        params.set('companyIds', selectedCompanies.join(','))
      }
      if (selectedPartners.length > 0) {
        params.set('partnerIds', selectedPartners.join(','))
      }

      const response = await axios.get(`/api/bulk-price-update?${params.toString()}`)
      setAllProducts(response.data.products || [])
    } catch (error) {
      console.error('Failed to fetch all products', error)
      setAllProducts([])
    }
  }, [selectedCompanies, selectedPartners])

  // Load all products when companies or partners are selected or changed
  useEffect(() => {
    if (selectedCompanies.length > 0 || selectedPartners.length > 0) {
      fetchAllProducts()
    } else {
      setAllProducts([])
    }
  }, [selectedCompanies, selectedPartners, fetchAllProducts])

  // Clear invalid product selections when companies/partners change
  useEffect(() => {
    if (selectedProducts.length > 0 && allProducts.length > 0) {
      const validProducts = selectedProducts.filter(productId =>
        allProducts.some(p => p.id === productId)
      )

      if (validProducts.length !== selectedProducts.length) {
        setSelectedProducts(validProducts)
      }
    }
  }, [selectedProducts, allProducts])

  const fetchProducts = useCallback(async () => {
    if (updateAllProducts) {
      // For global update, don't fetch products - just clear the list
      setProducts([])
      setStats(null)
      return
    }

    if (selectedCompanies.length === 0 && selectedPartners.length === 0 && selectedProducts.length === 0) {
      setProducts([])
      setStats(null)
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams()

      if (selectedCompanies.length > 0) {
        params.set('companyIds', selectedCompanies.join(','))
      }
      if (selectedPartners.length > 0) {
        params.set('partnerIds', selectedPartners.join(','))
      }
      if (selectedProducts.length > 0) {
        params.set('productIds', selectedProducts.join(','))
      }

      const response = await axios.get(`/api/bulk-price-update?${params.toString()}`)
      setProducts(response.data.products)
      setStats(response.data.stats)
    } catch (error) {
      console.error('Failed to fetch products', error)
      toast.error('Failed to fetch products')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanies, selectedPartners, selectedProducts, updateAllProducts])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleBulkPriceUpdate = async () => {
    if (!updateValue || isNaN(Number(updateValue))) {
      toast.error('Please enter a valid number')
      return
    }

    if (!updateAllProducts && selectedCompanies.length === 0 && selectedPartners.length === 0 && selectedProducts.length === 0) {
      toast.error('Please select at least one company, partner, product, or enable "Update All Products"')
      return
    }

    setIsUpdating(true)
    try {
      const requestData = {
        companyIds: updateAllProducts ? undefined : (selectedCompanies.length > 0 ? selectedCompanies : undefined),
        partnerIds: updateAllProducts ? undefined : (selectedPartners.length > 0 ? selectedPartners : undefined),
        productIds: updateAllProducts ? undefined : (selectedProducts.length > 0 ? selectedProducts : undefined),
        updateAllProducts,
        priceType,
        updateType,
        value: Number(updateValue)
      }

      const response = await axios.post('/api/bulk-price-update', requestData)

      toast.success(`Successfully updated ${response.data.summary.totalVariantsUpdated} product variants`)

      // Refresh the products to show updated prices
      await fetchProducts()

      // Reset form
      setUpdateValue('')
      setShowPreview(false)
    } catch (error) {
      console.error('Failed to update prices', error)
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.error || 'Failed to update prices')
      } else {
        toast.error('Failed to update prices')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const calculatePreviewPrice = (currentPrice: number | null): number | null => {
    if (currentPrice === null || !updateValue || isNaN(Number(updateValue))) {
      return currentPrice
    }

    const value = Number(updateValue)
    let newPrice: number

    switch (updateType) {
      case 'exact':
        newPrice = value
        break
      case 'percentage':
        newPrice = currentPrice + (currentPrice * value / 100)
        break
      case 'addition':
        newPrice = currentPrice + value
        break
      case 'subtraction':
        newPrice = Math.max(0, currentPrice - value)
        break
      default:
        newPrice = currentPrice
    }

    return Math.round(newPrice * 100) / 100
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A'
    return `PKR ${amount.toLocaleString()}`
  }

  const getUpdateDescription = () => {
    if (!updateValue) return ''

    const value = Number(updateValue)
    switch (updateType) {
      case 'exact':
        return `Set to ${formatCurrency(value)}`
      case 'percentage':
        return `${value > 0 ? '+' : ''}${value}%`
      case 'addition':
        return `+${formatCurrency(value)}`
      case 'subtraction':
        return `-${formatCurrency(value)}`
      default:
        return ''
    }
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-500 mb-2">Price Management System</h1>
        <p className="text-muted-foreground">Manage product prices across companies and partners</p>
      </div>

      {/* Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Selection
          </CardTitle>
          <CardDescription>
            Select companies, partners, or specific products to manage their prices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox
              id="update-all-products"
              checked={updateAllProducts}
              onCheckedChange={(checked) => {
                setUpdateAllProducts(checked as boolean)
                if (checked) {
                  // Clear individual selections when updating all products
                  setSelectedCompanies([])
                  setSelectedPartners([])
                  setSelectedProducts([])
                  setShowPreview(false) // Disable preview for global updates
                }
              }}
            />
            <div>
              <label htmlFor="update-all-products" className="text-sm font-medium text-blue-700">
                Update All Products Globally
              </label>
              <p className="text-xs text-blue-600">
                Enable this to update prices for all products in the system without selecting specific companies or partners
              </p>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${updateAllProducts ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <Label>Companies</Label>
              <SearchableMultiSelect
                apiEndpoint="/api/company"
                searchKey="companyName"
                selected={selectedCompanies}
                onChange={setSelectedCompanies}
                placeholder={updateAllProducts ? "Disabled (updating all)" : "Select companies"}
              />
            </div>

            <div>
              <Label>Partners</Label>
              <SearchableMultiSelect
                apiEndpoint="/api/partner"
                searchKey="partnerName"
                selected={selectedPartners}
                onChange={setSelectedPartners}
                placeholder={updateAllProducts ? "Disabled (updating all)" : "Select partners"}
              />
            </div>

            <div>
              <Label>Specific Products (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {updateAllProducts
                  ? "Disabled when updating all products globally"
                  : "Leave empty to affect all products from selected companies/partners"
                }
              </p>
              {!updateAllProducts && allProducts.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {allProducts.map(product => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProducts(prev => [...prev, product.id])
                            } else {
                              setSelectedProducts(prev => prev.filter(id => id !== product.id))
                            }
                          }}
                        />
                        <label htmlFor={`product-${product.id}`} className="text-sm">
                          {product.productName}
                        </label>
                      </div>
                    ))}
                </div>
              )}
              {!updateAllProducts && (selectedCompanies.length > 0 || selectedPartners.length > 0) && allProducts.length === 0 && (
                <div className="text-sm text-muted-foreground">Loading products...</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Section */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Price Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{stats.totalProducts}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{stats.totalVariants}</div>
                <div className="text-sm text-muted-foreground">Total Variants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {formatCurrency(Math.round(stats.avgCustomerPrice))}
                </div>
                <div className="text-sm text-muted-foreground">Avg Customer Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {formatCurrency(Math.round(stats.avgCompanyPrice))}
                </div>
                <div className="text-sm text-muted-foreground">Avg Company Price</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Update Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Bulk Price Update
          </CardTitle>
          <CardDescription>
            Configure how you want to update the selected products' prices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Price Type</Label>
              <Select value={priceType} onValueChange={(value: any) => setPriceType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customerPrice">Our Price</SelectItem>
                  <SelectItem value="companyPrice">Retail Price</SelectItem>
                  <SelectItem value="dealerPrice">Purchase Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Update Method</Label>
              <Select value={updateType} onValueChange={(value: any) => setUpdateType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Set Exact Amount</SelectItem>
                  <SelectItem value="percentage">Add/Subtract Percentage</SelectItem>
                  <SelectItem value="addition">Add Amount</SelectItem>
                  <SelectItem value="subtraction">Subtract Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                {updateType === 'percentage' ? 'Percentage (%)' : 'Amount (PKR)'}
              </Label>
              <Input
                type="number"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                placeholder={updateType === 'percentage' ? 'e.g., 10 for +10%' : 'e.g., 100'}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                disabled={!updateValue || updateAllProducts || (!updateAllProducts && products.length === 0)}
              >
                {updateAllProducts ? 'Preview Disabled (Global Mode)' : 'Preview Changes'}
              </Button>
              <Button
                onClick={handleBulkPriceUpdate}
                disabled={isUpdating || !updateValue || (!updateAllProducts && products.length === 0)}
                className="bg-green-500 hover:bg-green-600"
              >
                {isUpdating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                ) : (
                  'Apply Changes'
                )}
              </Button>
            </div>
          </div>

          {updateValue && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">
                <strong>Update Preview:</strong> {getUpdateDescription()} will be applied to {priceType.replace('Price', ' Price')}
                of {updateAllProducts ? 'ALL products in the database' : `${products.length} products (${products.reduce((sum, p) => sum + p.variants.length, 0)} variants)`}
              </p>
              {updateAllProducts && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Warning: This will update ALL products in the database. Please proceed with caution.
                </p>
              )}
            </div>
          )}

          {updateAllProducts && updateValue && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm font-medium text-orange-700">
                🚫 Preview mode is disabled for global updates
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Global updates affect the entire database and cannot be previewed. Please double-check your settings before applying.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Table */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading products...</span>
          </CardContent>
        </Card>
      ) : products.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Selected Products & Pricing</CardTitle>
            <CardDescription>
              Review the products and their current pricing before applying changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Current Price</TableHead>
                    {showPreview && <TableHead>New Price</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) =>
                    product.variants.map((variant, variantIndex) => (
                      <TableRow key={`${product.id}-${variant.id}`}>
                        {variantIndex === 0 && (
                          <>
                            <TableCell rowSpan={product.variants.length}>
                              {product.image ? (
                                <div className="relative w-12 h-12">
                                  <Image
                                    src={product.image.url}
                                    alt={product.image.alt}
                                    fill
                                    className="rounded object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs">
                                  No img
                                </div>
                              )}
                            </TableCell>
                            <TableCell rowSpan={product.variants.length}>
                              <div>
                                <p className="font-medium text-sm">{product.productName}</p>
                                {product.genericName && (
                                  <p className="text-xs text-muted-foreground">{product.genericName}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell rowSpan={product.variants.length}>
                              {product.company.companyName}
                            </TableCell>
                            <TableCell rowSpan={product.variants.length}>
                              {product.partner.partnerName}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{variant.packingVolume}</span>
                            <span className="text-muted-foreground ml-2">
                              (Stock: {variant.inventory})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(variant[priceType])}
                        </TableCell>
                        {showPreview && (
                          <TableCell>
                            <span className="text-green-600 font-medium">
                              {formatCurrency(calculatePreviewPrice(variant[priceType]))}
                            </span>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        updateAllProducts ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              Global update mode enabled - All products will be updated when you apply changes
            </CardContent>
          </Card>
        ) : selectedCompanies.length > 0 || selectedPartners.length > 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No products found for the selected criteria
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              Select companies or partners to view their products, or enable "Update All Products" for global updates
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}