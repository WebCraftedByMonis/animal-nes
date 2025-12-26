'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Edit, Loader2, Search, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Product {
  id: number;
  productName: string;
  genericName: string;
}

interface ProductVariant {
  id: number;
  packingVolume: string;
}

interface Animal {
  id: number;
  specie: string;
  breed: string;
}

interface Partner {
  id: number;
  partnerName: string;
  shopName: string;
}

interface Company {
  id: number;
  companyName: string;
}

interface Item {
  id: number;
  checkoutId: number;
  productId: number | null;
  animalId: number | null;
  variantId: number | null;
  quantity: number;
  price: number;
  purchasedPrice: number | null;
  product: Product | null;
  variant: ProductVariant | null;
  animal: Animal | null;
}

interface Order {
  id: string;
  createdAt: string;
  status: string;
  items: Item[];
}

interface VendorPurchase {
  orderId: string;
  itemId: number;
  orderDate: string;
  partnerName: string;
  companyName: string;
  productName: string;
  animalDetails: string;
  variant: string;
  quantity: number;
  sellingPrice: number;
  purchasedPrice: number | null;
  status: string;
}

export default function PurchasedFromVendorsPage() {
  const [purchases, setPurchases] = useState<VendorPurchase[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editedPurchasedPrice, setEditedPurchasedPrice] = useState<number>(0)
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null)

  const handleSearch = () => {
    setPage(1)
    fetchPurchases(search, 1, limit)
  }

  const resetFilters = () => {
    setSearch('')
    setPage(1)
    fetchPurchases('', 1, limit)
  }

  const fetchPurchases = useCallback(async (searchTerm = '', pageNum = page, limitNum = limit) => {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/vendor-purchases', {
        params: { search: searchTerm, page: pageNum, limit: limitNum },
      })
      setPurchases(response.data.purchases)
      setTotal(response.data.total)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load vendor purchases')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchPurchases('', 1, limit)
  }, [limit])

  useEffect(() => {
    if (page > 1) {
      fetchPurchases(search, page, limit)
    }
  }, [page])

  const handleEditClick = (itemId: number, currentPrice: number | null) => {
    setEditingItemId(itemId)
    setEditedPurchasedPrice(currentPrice || 0)
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditedPurchasedPrice(0)
  }

  const handleSavePrice = async (itemId: number) => {
    setUpdatingItemId(itemId)
    try {
      await axios.patch('/api/vendor-purchases', {
        itemId,
        purchasedPrice: editedPurchasedPrice
      })

      setPurchases(prev => prev.map(purchase =>
        purchase.itemId === itemId
          ? { ...purchase, purchasedPrice: editedPurchasedPrice }
          : purchase
      ))

      toast.success('Purchased price updated successfully!')
      setEditingItemId(null)
    } catch (err) {
      console.error('Error updating purchased price', err)
      toast.error('Failed to update purchased price')
    } finally {
      setUpdatingItemId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-green-500">Purchased From Vendors</h1>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by partner, company, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 focus:border-green-500 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            className="bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            onClick={resetFilters}
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            disabled={isLoading}
          >
            Clear
          </Button>
        </div>

        <select
          className="border p-2 rounded focus:border-green-500 focus:ring-green-500"
          value={limit}
          onChange={(e) => {
            const newLimit = Number(e.target.value)
            setLimit(newLimit)
            setPage(1)
            fetchPurchases(search, 1, newLimit)
          }}
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              Show {n}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        {isLoading && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin inline-block text-green-600" />
            <span className="ml-2 text-gray-600">Loading purchases...</span>
          </div>
        )}

        {!isLoading && purchases.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No vendor purchases found. Orders will appear here once placed.
          </div>
        )}

        {!isLoading && purchases.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Partner Name</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Animal Details</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Purchased Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {purchases.map((purchase) => (
              <TableRow key={`${purchase.orderId}-${purchase.itemId}`}>
                <TableCell className="font-mono text-sm">{purchase.orderId}</TableCell>
                <TableCell>{new Date(purchase.orderDate).toLocaleDateString()}</TableCell>
                <TableCell>{purchase.partnerName || '-'}</TableCell>
                <TableCell>{purchase.companyName || '-'}</TableCell>
                <TableCell>{purchase.productName || '-'}</TableCell>
                <TableCell>{purchase.animalDetails || '-'}</TableCell>
                <TableCell>{purchase.variant || '-'}</TableCell>
                <TableCell>{purchase.quantity}</TableCell>
                <TableCell className="font-semibold">PKR {purchase.sellingPrice.toFixed(2)}</TableCell>
                <TableCell>
                  {editingItemId === purchase.itemId ? (
                    <Input
                      type="number"
                      value={editedPurchasedPrice}
                      onChange={(e) => setEditedPurchasedPrice(Number(e.target.value))}
                      className="w-32"
                      min="0"
                      step="0.01"
                      autoFocus
                    />
                  ) : (
                    <span className={purchase.purchasedPrice ? 'font-semibold text-green-600' : 'text-gray-400'}>
                      {purchase.purchasedPrice ? `PKR ${purchase.purchasedPrice.toFixed(2)}` : 'Not Set'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-sm ${
                    purchase.status === 'delivered'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {purchase.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {editingItemId === purchase.itemId ? (
                      <>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSavePrice(purchase.itemId)}
                                disabled={updatingItemId === purchase.itemId}
                              >
                                {updatingItemId === purchase.itemId ? (
                                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                                ) : (
                                  <Save className="w-5 h-5 text-green-500" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Save</p>
                            </TooltipContent>
                          </UITooltip>

                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-5 h-5 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cancel</p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </>
                    ) : (
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(purchase.itemId, purchase.purchasedPrice)}
                            >
                              <Edit className="w-5 h-5 text-blue-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Purchased Price</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </div>

      {!isLoading && purchases.length > 0 && (
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            disabled={page === 1 || isLoading}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            Prev
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages} • Total: {total} purchases
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
