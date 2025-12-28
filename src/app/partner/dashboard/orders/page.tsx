'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Loader2, Search, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface OrderItem {
  itemId: number;
  productName: string;
  companyName: string;
  variant: string;
  quantity: number;
  sellingPrice: number;
  purchasedPrice: number;
  totalProfit: number;
  partnerShare: number;
  websiteShare: number;
}

interface PartnerOrder {
  orderId: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  status: string;
  city: string;
  province: string;
  address: string;
  shippingAddress: string;
  paymentMethod: string;
  items: OrderItem[];
}

export default function PartnerOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PartnerOrder[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [totalEarnings, setTotalEarnings] = useState(0)

  const handleSearch = () => {
    setPage(1)
    fetchOrders(search, 1, limit)
  }

  const resetFilters = () => {
    setSearch('')
    setPage(1)
    fetchOrders('', 1, limit)
  }

  const fetchOrders = useCallback(async (searchTerm = '', pageNum = page, limitNum = limit) => {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/partner/orders', {
        params: { search: searchTerm, page: pageNum, limit: limitNum },
      })
      setOrders(response.data.orders)
      setTotal(response.data.total)

      // Calculate total earnings from all orders
      const earnings = response.data.orders.reduce((sum: number, order: PartnerOrder) => {
        const orderEarnings = order.items.reduce((itemSum, item) => itemSum + item.partnerShare, 0)
        return sum + orderEarnings
      }, 0)
      setTotalEarnings(earnings)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchOrders('', 1, limit)
  }, [limit])

  useEffect(() => {
    if (page > 1) {
      fetchOrders(search, page, limit)
    }
  }, [page])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo.jpg"
                alt="Animal Wellness Logo"
                width={120}
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Partner Dashboard - Orders</h1>
              </div>
            </div>
            <button
              onClick={() => router.push('/partner/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Earnings Summary */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Your Earnings from Product Sales</h3>
          <p className="text-4xl font-bold mb-2">PKR {totalEarnings.toFixed(2)}</p>
          <p className="text-sm opacity-90">
            This shows your 50% share of profits from all sold products. The profit is calculated as (Selling Price - Purchased Price) × 50%.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-green-500 mb-4">Product Sales Orders</h1>

          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by order ID, customer name, email..."
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
                fetchOrders(search, 1, newLimit)
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
                <span className="ml-2 text-gray-600">Loading orders...</span>
              </div>
            )}

            {!isLoading && orders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No orders found. Your product sales will appear here.
              </div>
            )}

            {!isLoading && orders.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Customer Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Purchased Price</TableHead>
                    <TableHead>Total Profit</TableHead>
                    <TableHead>Your Share (50%)</TableHead>
                    <TableHead>Website Share (50%)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {orders.map((order) => (
                    order.items.map((item, idx) => (
                      <TableRow key={`${order.orderId}-${item.itemId}`}>
                        {idx === 0 && (
                          <>
                            <TableCell rowSpan={order.items.length} className="font-mono text-sm">
                              {order.orderId}
                            </TableCell>
                            <TableCell rowSpan={order.items.length}>
                              {new Date(order.orderDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell rowSpan={order.items.length}>
                              {order.customerName}
                            </TableCell>
                            <TableCell rowSpan={order.items.length}>
                              {order.customerEmail}
                            </TableCell>
                            <TableCell rowSpan={order.items.length}>
                              {order.city}, {order.province}
                            </TableCell>
                          </>
                        )}

                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.companyName}</TableCell>
                        <TableCell>{item.variant}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="font-semibold">
                          PKR {item.sellingPrice.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={item.purchasedPrice > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                            {item.purchasedPrice > 0 ? `PKR ${item.purchasedPrice.toFixed(2)}` : 'Not Set'}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          PKR {item.totalProfit.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          PKR {item.partnerShare.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          PKR {item.websiteShare.toFixed(2)}
                        </TableCell>

                        {idx === 0 && (
                          <>
                            <TableCell rowSpan={order.items.length}>
                              <span className={`px-2 py-1 rounded text-sm font-semibold ${
                                order.status === 'delivered'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {order.status}
                              </span>
                            </TableCell>
                            <TableCell rowSpan={order.items.length}>
                              <button
                                onClick={() => window.open(`/api/orders/${order.orderId}/invoice`, '_blank')}
                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                title="View Order Details"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span className="text-sm">View Invoice</span>
                              </button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {!isLoading && orders.length > 0 && (
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
                disabled={page === 1 || isLoading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                Prev
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages} • Total: {total} orders
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

        {/* Information Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">How Profit Sharing Works:</h4>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li><strong>Selling Price:</strong> The price customers paid for your products</li>
            <li><strong>Purchased Price:</strong> The price set when the order was placed (your supply cost)</li>
            <li><strong>Total Profit:</strong> Calculated as (Selling Price - Purchased Price) × Quantity</li>
            <li><strong>Your Share:</strong> You receive 50% of the total profit</li>
            <li><strong>Website Share:</strong> The platform receives 50% of the total profit</li>
          </ul>
          <p className="text-sm text-blue-800 mt-3">
            <strong>Note:</strong> Your earnings from product sales are automatically credited to your wallet along with appointment fees and additional consultation charges. You can request withdrawals from the Wallet & Referrals section in your dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
