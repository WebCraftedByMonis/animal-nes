'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Download, Loader2, Search, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import WhatsAppLink from '@/components/WhatsAppLink'
import { useCountry } from '@/contexts/CountryContext'

interface Product {
  id: number
  productName: string
  genericName: string
  quantity: number
}

interface ProductVariant {
  id: number
  packingVolume: string
  customerPrice: number
}

interface Animal {
  id: number
  specie: string
  breed: string
  quantity: number
  totalPrice: number
  status: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface Item {
  id: number
  checkoutId: number
  productId: number | null
  animalId: number | null
  variantId: number | null
  quantity: number
  price: number
  purchasedPrice: number | null
  product: Product | null
  variant: ProductVariant | null
  animal: Animal | null
}

interface User {
  id: string
  name: string
  email: string
  emailVerified: string | null
  image: string
}

interface Order {
  id: string
  userId: string
  city: string
  province: string
  address: string
  shippingAddress: string
  shipmentcharges: string
  paymentMethod: string
  total: number
  status: string
  createdAt: string
  user: User
  items: Item[]
}

export default function OrdersCompletedPage() {
  const { country, currencySymbol } = useCountry()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const fetchOrders = useCallback(async (searchTerm = '', pageNum = page, limitNum = limit) => {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/orders', {
        params: { search: searchTerm, page: pageNum, limit: limitNum, country, status: 'delivered' },
      })
      setOrders(response.data.orders)
      setTotal(response.data.total)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load completed orders')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, country])

  useEffect(() => {
    fetchOrders('', 1, limit)
  }, [limit, country])

  useEffect(() => {
    if (page > 1) fetchOrders(search, page, limit)
  }, [page])

  const handleSearch = () => {
    setPage(1)
    fetchOrders(search, 1, limit)
  }

  const resetFilters = () => {
    setSearch('')
    setPage(1)
    fetchOrders('', 1, limit)
  }

  // Revenue chart — group delivered orders by date (last 30 days)
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    const revenue = orders
      .filter(o => {
        const od = new Date(o.createdAt)
        od.setHours(0, 0, 0, 0)
        return od.getTime() === d.getTime()
      })
      .reduce((sum, o) => sum + o.total, 0)
    return { name: label, revenue }
  }).reverse()

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
        <h1 className="text-3xl font-bold text-green-500">Completed Orders</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Completed Orders</p>
          <p className="text-2xl font-bold text-green-700">{total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Revenue (current page)</p>
          <p className="text-2xl font-bold text-green-700">{currencySymbol} {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Avg Order Value (current page)</p>
          <p className="text-2xl font-bold text-green-700">
            {currencySymbol} {orders.length > 0 ? Math.round(totalRevenue / orders.length).toLocaleString() : 0}
          </p>
        </div>
      </div>

      {/* Search / Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, email, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 focus:border-green-500 focus:ring-green-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
            <Search className="w-4 h-4" />
          </Button>
          <Button onClick={resetFilters} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50" disabled={isLoading}>
            Clear
          </Button>
        </div>

        <select
          className="border p-2 rounded focus:border-green-500"
          value={limit}
          onChange={(e) => {
            const n = Number(e.target.value)
            setLimit(n)
            setPage(1)
            fetchOrders(search, 1, n)
          }}
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>Show {n}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin inline-block text-green-600" />
            <span className="ml-2 text-gray-600">Loading orders...</span>
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No completed orders found.
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Buyer Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Delivered On</TableHead>
                <TableHead>Specie</TableHead>
                <TableHead>Breed</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Animal Qty</TableHead>
                <TableHead>Product Qty</TableHead>
                <TableHead>Animal Price</TableHead>
                <TableHead>Product Price</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Invoice</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {orders.map((order) =>
                order.items.map((item, idx) => (
                  <TableRow key={`${order.id}-${idx}`}>
                    {idx === 0 && (
                      <>
                        <TableCell rowSpan={order.items.length}>{order.id}</TableCell>
                        <TableCell rowSpan={order.items.length}>{order.user?.name}</TableCell>
                        <TableCell rowSpan={order.items.length}>{order.user?.email}</TableCell>
                        <TableCell rowSpan={order.items.length}>{order.address}, {order.city}, {order.province}</TableCell>
                        <TableCell rowSpan={order.items.length}>
                          <WhatsAppLink phone={order.shippingAddress || ''} />
                        </TableCell>
                        <TableCell rowSpan={order.items.length} className="max-w-xs truncate" title={order.paymentMethod}>
                          {order.paymentMethod.length > 20 ? order.paymentMethod.substring(0, 20) + '...' : order.paymentMethod}
                        </TableCell>
                        <TableCell rowSpan={order.items.length}>
                          <span className="flex items-center gap-1 text-green-600 font-semibold whitespace-nowrap">
                            <CheckCircle2 className="w-4 h-4" />
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                      </>
                    )}

                    <TableCell>{item.animal?.specie ?? '-'}</TableCell>
                    <TableCell>{item.animal?.breed ?? '-'}</TableCell>
                    <TableCell>{item.product?.productName ?? '-'}</TableCell>
                    <TableCell>{item.variant?.packingVolume ?? '-'}</TableCell>
                    <TableCell>{item.animal ? item.quantity : '-'}</TableCell>
                    <TableCell>{item.product ? item.quantity : '-'}</TableCell>
                    <TableCell>{item.animal ? `${currencySymbol} ${item.price?.toFixed(2)}` : '-'}</TableCell>
                    <TableCell>{item.product ? `${currencySymbol} ${item.price?.toFixed(2)}` : '-'}</TableCell>

                    {idx === 0 && (
                      <>
                        <TableCell rowSpan={order.items.length} className="font-semibold">
                          {currencySymbol} {order.shipmentcharges}
                        </TableCell>
                        <TableCell rowSpan={order.items.length} className="font-semibold text-green-700">
                          {currencySymbol} {order.total.toFixed(2)}
                        </TableCell>
                        <TableCell rowSpan={order.items.length}>
                          <TooltipProvider>
                            <div className="flex items-center gap-1">
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => window.open(`/api/orders/${order.id}/invoice`, '_blank')}
                                  >
                                    <Download className="w-5 h-5 text-blue-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Download Invoice</p></TooltipContent>
                              </UITooltip>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => window.open(`/api/orders/${order.id}/invoice?branded=true`, '_blank')}
                                  >
                                    <Download className="w-5 h-5 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Download Branded Invoice</p></TooltipContent>
                              </UITooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && orders.length > 0 && (
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            disabled={page === 1 || isLoading}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            Prev
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages} • {total} delivered orders
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            Next
          </Button>
        </div>
      )}

      {/* Revenue chart */}
      <div className="mt-8">
        <h2 className="text-lg font-medium mb-2 text-green-600">Delivered Order Revenue — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v) => [`${currencySymbol} ${Number(v).toLocaleString()}`, 'Revenue']} />
            <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
