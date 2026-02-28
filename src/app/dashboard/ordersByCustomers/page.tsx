'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Trash2, Download, Edit, Loader2, Search, Plus, X, ShoppingCart } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import WhatsAppLink from '@/components/WhatsAppLink'
import { useCountry } from '@/contexts/CountryContext'

interface Product {
  id: number;
  productName: string;
  genericName: string;
  quantity: number;
}

interface ProductVariant {
  id: number;
  packingVolume: string;
  customerPrice: number;
}

interface Animal {
  id: number;
  specie: string;
  breed: string;
  quantity: number;
  totalPrice: number;
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
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

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: string | null;
  image: string;
}

interface Order {
  id: string;
  userId: string;
  city: string;
  province: string;
  address: string;
  shippingAddress: string;
  shipmentcharges: string;
  paymentMethod: string;
  total: number;
  status: string;
  createdAt: string;
  user: User;
  items: Item[];
}

interface EditedItem {
  id: number;
  quantity: number;
  price: number;
  purchasedPrice: number | null;
}

interface ManualItem {
  localId: string;
  productId?: number;
  productName?: string;
  variantId?: number;
  variantLabel?: string;
  availableVariants: { id: number; packingVolume: string; customerPrice: number }[];
  quantity: number;
  price: number;
  purchasedPrice: number | null;
}

export default function AdminOrdersPage() {
  const { country, currencySymbol } = useCountry()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editedPaymentMethod, setEditedPaymentMethod] = useState('')
  const [editedItems, setEditedItems] = useState<EditedItem[]>([])
  const [updatingOrder, setUpdatingOrder] = useState(false)

  // ── Manual Order ──────────────────────────────────────────────
  const [manualOrderOpen, setManualOrderOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [manualCity, setManualCity] = useState('')
  const [manualProvince, setManualProvince] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualPayment, setManualPayment] = useState('')
  const [manualShipment, setManualShipment] = useState(0)
  const [manualStatus, setManualStatus] = useState<'pending' | 'delivered'>('pending')
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const productSearchRef = useRef<HTMLDivElement>(null)

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return

    setDeletingOrderId(orderToDelete)
    try {
      await axios.delete(`/api/orders/${orderToDelete}/delete`)
      setOrders((prev) => prev.filter((order) => order.id !== orderToDelete))
      toast.success('Order deleted successfully!')
    } catch (err) {
      console.error('Error deleting order', err)
      toast.error('Failed to delete order. Please try again.')
    } finally {
      setDeletingOrderId(null)
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
    }
  }

  const handleEditClick = (order: Order) => {
    setEditingOrder(order)
    setEditedPaymentMethod(order.paymentMethod)
    setEditedItems(order.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      purchasedPrice: (item as any).purchasedPrice || null
    })))
    setEditDialogOpen(true)
  }
  const handleUpdateOrder = async () => {
    if (!editingOrder) return

    setUpdatingOrder(true)
    try {
      await axios.patch(`/api/orders/${editingOrder.id}/update`, {
        paymentMethod: editedPaymentMethod,
        items: editedItems,
        shipmentcharges: editingOrder.shipmentcharges,
        total: editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + parseFloat(editingOrder.shipmentcharges || '0')
      });

      // Update the order in the state
      setOrders((prev) => prev.map((order) => {
        if (order.id === editingOrder.id) {
          return {
            ...order,
            paymentMethod: editedPaymentMethod,
            shipmentcharges: editingOrder.shipmentcharges,
            items: order.items.map((item) => {
              const editedItem = editedItems.find((ei) => ei.id === item.id)
              if (editedItem) {
                return {
                  ...item,
                  quantity: editedItem.quantity,
                  price: editedItem.price,
                  purchasedPrice: editedItem.purchasedPrice
                }
              }
              return item
            }),
            total: editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + parseFloat(editingOrder.shipmentcharges || '0')
          }
        }
        return order
      }))

      toast.success('Order updated successfully!')
      setEditDialogOpen(false)
    } catch (err) {
      console.error('Error updating order', err)
      toast.error('Failed to update order. Please try again.')
    } finally {
      setUpdatingOrder(false)
    }
  }

  const updateItemField = (itemId: number, field: 'quantity' | 'price' | 'purchasedPrice', value: number) => {
    setEditedItems((prev) => prev.map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item
    ))
  }

  // ── Manual Order Handlers ──────────────────────────────────────
  const searchUsers = useCallback(async (term: string) => {
    if (!term.trim()) { setUserResults([]); return }
    setSearchingUsers(true)
    try {
      const { data } = await axios.get('/api/users', { params: { search: term, pageSize: 6 } })
      setUserResults(data.users || [])
    } catch {
      setUserResults([])
    } finally {
      setSearchingUsers(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchUsers(userSearch), 300)
    return () => clearTimeout(t)
  }, [userSearch, searchUsers])

  const searchProducts = useCallback(async (term: string) => {
    if (!term.trim()) { setProductResults([]); setShowProductDropdown(false); return }
    setSearchingProducts(true)
    try {
      const { data } = await axios.get('/api/product', { params: { search: term, limit: 8 } })
      setProductResults(data.data || [])
      setShowProductDropdown(true)
    } catch {
      setProductResults([])
    } finally {
      setSearchingProducts(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 300)
    return () => clearTimeout(t)
  }, [productSearch, searchProducts])

  const addProductToItems = (product: any) => {
    const firstVariant = product.variants?.[0]
    const newItem: ManualItem = {
      localId: Date.now().toString(),
      productId: product.id,
      productName: product.productName,
      variantId: firstVariant?.id,
      variantLabel: firstVariant?.packingVolume,
      availableVariants: product.variants || [],
      quantity: 1,
      price: firstVariant?.customerPrice || 0,
      purchasedPrice: null,
    }
    setManualItems(prev => [...prev, newItem])
    setProductSearch('')
    setProductResults([])
    setShowProductDropdown(false)
  }

  const updateManualItem = (localId: string, field: keyof ManualItem, value: any) => {
    setManualItems(prev => prev.map(item => {
      if (item.localId !== localId) return item
      if (field === 'variantId') {
        const variant = item.availableVariants.find(v => v.id === Number(value))
        return { ...item, variantId: variant?.id, variantLabel: variant?.packingVolume, price: variant?.customerPrice || item.price }
      }
      return { ...item, [field]: value }
    }))
  }

  const removeManualItem = (localId: string) => {
    setManualItems(prev => prev.filter(i => i.localId !== localId))
  }

  const resetManualOrderForm = () => {
    setSelectedUser(null)
    setUserSearch('')
    setUserResults([])
    setManualCity('')
    setManualProvince('')
    setManualAddress('')
    setManualPhone('')
    setManualPayment('')
    setManualShipment(0)
    setManualStatus('pending')
    setManualItems([])
    setProductSearch('')
    setProductResults([])
    setShowProductDropdown(false)
  }

  const handleCreateManualOrder = async () => {
    if (!selectedUser) { toast.error('Please select a customer'); return }
    if (!manualCity) { toast.error('City is required'); return }
    if (!manualAddress) { toast.error('Address is required'); return }
    if (!manualPhone) { toast.error('Mobile number is required'); return }
    if (!manualPayment) { toast.error('Payment method is required'); return }
    if (manualItems.length === 0) { toast.error('Add at least one item'); return }

    setCreatingOrder(true)
    try {
      await axios.post('/api/orders/manual', {
        userId: selectedUser.id,
        city: manualCity,
        province: manualProvince,
        address: manualAddress,
        shippingAddress: manualPhone,
        paymentMethod: manualPayment,
        shipmentCharges: manualShipment,
        status: manualStatus,
        items: manualItems.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          price: i.price,
          purchasedPrice: i.purchasedPrice,
        })),
      })
      toast.success('Order created successfully!')
      setManualOrderOpen(false)
      resetManualOrderForm()
      fetchOrders('', 1, limit)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create order')
    } finally {
      setCreatingOrder(false)
    }
  }

  const manualTotal = manualItems.reduce((s, i) => s + i.price * i.quantity, 0) + manualShipment

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
      const response = await axios.get('/api/orders', {
        params: { search: searchTerm, page: pageNum, limit: limitNum, country, status: 'pending' },
      })
      setOrders(response.data.orders)
      setTotal(response.data.total)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, country])

  // Load initial data on component mount
  useEffect(() => {
    fetchOrders('', 1, limit)
  }, [limit, country])

  // Handle page changes - maintain current search
  useEffect(() => {
    if (page > 1) {
      fetchOrders(search, page, limit)
    }
  }, [page])

  // Group orders by date for chart
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)

    const label = d.toLocaleDateString("en-US", { day: "numeric", month: "short" })

    const count = orders.filter(o => {
      const orderDate = new Date(o.createdAt)
      orderDate.setHours(0, 0, 0, 0)
      return orderDate.getTime() === d.getTime()
    }).length

    return { name: label, orders: count }
  }).reverse()

  const totalPages = Math.ceil(total / limit)

  const handleStatusToggle = async (orderId: string) => {
    try {
      await axios.patch(`/api/orders/${orderId}/status`)
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: 'delivered' } : order
        )
      )
      toast.success('Order status updated to delivered')
    } catch (err) {
      console.error('Error updating status', err)
      toast.error('Failed to update order status')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-green-500">Pending Orders</h1>
        <Button
          onClick={() => { resetManualOrderForm(); setManualOrderOpen(true) }}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Manual Order
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, email, city, or mobile..."
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
            No orders found. Try adjusting your search criteria.
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
              <TableHead>Mobile Number</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Specie</TableHead>
              <TableHead>Breed</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Animal Qty</TableHead>
              <TableHead>Product Qty</TableHead>
              <TableHead>Animal Price</TableHead>
              <TableHead>Product Price</TableHead>
              <TableHead>Shipment Charges</TableHead>
              <TableHead>Order Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {orders.map((order) => (
              order.items.map((item, idx) => (
                <TableRow key={`${order.id}-${idx}`}>
                  {idx === 0 && (
                    <>
                      <TableCell rowSpan={order.items.length}>{order.id}</TableCell>
                      <TableCell rowSpan={order.items.length}>{order.user?.name}</TableCell>
                      <TableCell rowSpan={order.items.length}>{order.user?.email}</TableCell>
                      <TableCell rowSpan={order.items.length}>{order.address}, {order.city}, {order.province}</TableCell>
                      <TableCell rowSpan={order.items.length}><WhatsAppLink phone={order.shippingAddress || ''} /></TableCell>
                      <TableCell rowSpan={order.items.length} className="max-w-xs truncate" title={order.paymentMethod}>
                        {order.paymentMethod.length > 20 ? order.paymentMethod.substring(0, 20) + '...' : order.paymentMethod}
                      </TableCell>
                      <TableCell rowSpan={order.items.length}>
                        {order.status === 'pending' ? (
                          <button
                            onClick={() => handleStatusToggle(order.id)}
                            className="bg-yellow-300 px-2 py-1 rounded text-sm hover:bg-yellow-400"
                          >
                            Mark as Delivered
                          </button>
                        ) : (
                          <span className="text-green-600 font-semibold">Delivered</span>
                        )}
                      </TableCell>
                      <TableCell rowSpan={order.items.length}>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
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
                      <TableCell rowSpan={order.items.length} className="font-semibold">
                        {currencySymbol} {order.total.toFixed(2)}
                      </TableCell>
                    </>
                  )}

                  {idx === 0 && (
                    <TableCell rowSpan={order.items.length}>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(order)}
                              >
                                <Edit className="w-5 h-5 text-blue-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit Order</p>
                            </TooltipContent>
                          </UITooltip>

                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(order.id)}
                                disabled={deletingOrderId === order.id}
                              >
                                {deletingOrderId === order.id ? (
                                  <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                                ) : (
                                  <Trash2 className="w-5 h-5 text-red-500" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Order</p>
                            </TooltipContent>
                          </UITooltip>

                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/api/orders/${order.id}/invoice`, '_blank')}
                                className="relative"
                              >
                                <Download className="w-5 h-5 text-blue-600" />
                                <span className="sr-only">Download Invoice</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download Standard Invoice</p>
                            </TooltipContent>
                          </UITooltip>

                          {/* Branded Invoice Button */}
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/api/orders/${order.id}/invoice?branded=true`, '_blank')}
                                className="relative"
                              >
                                <Download className="w-5 h-5 text-green-600" />
                                
                                <span className="sr-only">Download Branded Invoice</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download  Invoice (with company details)</p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ))}
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

      {/* Line Chart */}
      <div className="mt-8">
        <h2 className="text-lg font-medium mb-2 text-green-600">
          Orders Over the Last 30 Days
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="orders"
              stroke="#22c55e"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Manual Order Dialog */}
      <Dialog open={manualOrderOpen} onOpenChange={(open) => { setManualOrderOpen(open); if (!open) resetManualOrderForm() }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <ShoppingCart className="w-5 h-5" />
              Create Manual Order
            </DialogTitle>
            <DialogDescription>
              Fill in the customer details and items to create an order manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* ── Customer Section ── */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Customer</h3>

              {/* User search */}
              <div className="space-y-1 relative">
                <Label>Search Customer *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type name or email..."
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setSelectedUser(null) }}
                  />
                  {searchingUsers && <Loader2 className="w-4 h-4 animate-spin self-center text-green-600" />}
                </div>
                {userResults.length > 0 && !selectedUser && (
                  <div className="absolute z-50 left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {userResults.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b last:border-b-0"
                        onClick={() => {
                          setSelectedUser(u)
                          setUserSearch(u.name)
                          setUserResults([])
                        }}
                      >
                        <span className="font-medium">{u.name}</span>
                        <span className="text-gray-400 ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-green-800">{selectedUser.name}</span>
                      <span className="text-green-600 ml-2">{selectedUser.email}</span>
                    </div>
                    <button onClick={() => { setSelectedUser(null); setUserSearch('') }}>
                      <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>City *</Label>
                  <Input value={manualCity} onChange={e => setManualCity(e.target.value)} placeholder="e.g. Lahore" />
                </div>
                <div className="space-y-1">
                  <Label>Province</Label>
                  <Input value={manualProvince} onChange={e => setManualProvince(e.target.value)} placeholder="e.g. Punjab" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Address *</Label>
                <Input value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="Street, area..." />
              </div>

              <div className="space-y-1">
                <Label>Mobile Number *</Label>
                <Input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="+92300..." />
              </div>
            </div>

            {/* ── Items Section ── */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Order Items</h3>

              {/* Product search */}
              <div className="relative" ref={productSearchRef}>
                <Label>Search & Add Product</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      className="pl-9"
                      placeholder="Type product name..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                  </div>
                  {searchingProducts && <Loader2 className="w-4 h-4 animate-spin self-center text-green-600" />}
                </div>
                {showProductDropdown && productResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {productResults.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b last:border-b-0"
                        onClick={() => addProductToItems(p)}
                      >
                        <span className="font-medium">{p.productName}</span>
                        {p.variants?.length > 0 && (
                          <span className="text-gray-400 ml-2 text-xs">
                            {p.variants.length} variant{p.variants.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items list */}
              {manualItems.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3">No items added yet.</p>
              )}

              {manualItems.map((item) => (
                <div key={item.localId} className="border rounded p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.productName || 'Custom Item'}</span>
                    <button onClick={() => removeManualItem(item.localId)}>
                      <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {item.availableVariants.length > 0 && (
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label className="text-xs">Variant</Label>
                        <Select
                          value={String(item.variantId ?? '')}
                          onValueChange={val => updateManualItem(item.localId, 'variantId', val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.availableVariants.map(v => (
                              <SelectItem key={v.id} value={String(v.id)}>
                                {v.packingVolume} — {currencySymbol} {v.customerPrice}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-xs"
                        value={item.quantity}
                        onChange={e => updateManualItem(item.localId, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sell Price ({currencySymbol})</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8 text-xs"
                        value={item.price}
                        onChange={e => updateManualItem(item.localId, 'price', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Purchase Price ({currencySymbol})</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8 text-xs"
                        value={item.purchasedPrice ?? ''}
                        placeholder="Optional"
                        onChange={e => updateManualItem(item.localId, 'purchasedPrice', e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    Subtotal: {currencySymbol} {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Payment Section ── */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Payment & Status</h3>

              <div className="space-y-1">
                <Label>Payment Method *</Label>
                <Textarea
                  value={manualPayment}
                  onChange={e => setManualPayment(e.target.value)}
                  placeholder="e.g. Cash on Delivery, Bank Transfer..."
                  className="min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Shipment Charges ({currencySymbol})</Label>
                  <Input
                    type="number"
                    min={0}
                    value={manualShipment}
                    onChange={e => setManualShipment(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Order Status</Label>
                  <Select value={manualStatus} onValueChange={(v) => setManualStatus(v as 'pending' | 'delivered')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded px-4 py-2 flex justify-between items-center">
                <span className="font-semibold text-green-800">Order Total</span>
                <span className="text-xl font-bold text-green-700">
                  {currencySymbol} {manualTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setManualOrderOpen(false); resetManualOrderForm() }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateManualOrder}
              disabled={creatingOrder}
              className="bg-green-600 hover:bg-green-700"
            >
              {creatingOrder ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><ShoppingCart className="mr-2 h-4 w-4" /> Create Order</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the order
              and remove the data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order #{editingOrder?.id}</DialogTitle>
            <DialogDescription>
              Make changes to the order details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          {editingOrder && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Textarea
                  id="payment-method"
                  value={editedPaymentMethod}
                  onChange={(e) => setEditedPaymentMethod(e.target.value)}
                  placeholder="Enter payment method"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-4">

                <h3 className="font-semibold">Order Items</h3>
                {editingOrder.items.map((item, index) => {
                  const editedItem = editedItems.find((ei) => ei.id === item.id)
                  if (!editedItem) return null

                  return (
                    <div key={item.id} className="border rounded p-4 space-y-2">
                      <div className="font-medium">
                        Item {index + 1}: {item.animal ? `${item.animal.specie} - ${item.animal.breed}` : `${item.product?.productName} - ${item.variant?.packingVolume}`}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                          <Input
                            id={`quantity-${item.id}`}
                            type="number"
                            value={editedItem.quantity}
                            onChange={(e) => updateItemField(item.id, 'quantity', Number(e.target.value))}
                            min="1"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`price-${item.id}`}>Selling Price ({currencySymbol})</Label>
                          <Input
                            id={`price-${item.id}`}
                            type="number"
                            value={editedItem.price}
                            onChange={(e) => updateItemField(item.id, 'price', Number(e.target.value))}
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`purchased-price-${item.id}`}>Purchased Price ({currencySymbol})</Label>
                          <Input
                            id={`purchased-price-${item.id}`}
                            type="number"
                            value={editedItem.purchasedPrice || 0}
                            onChange={(e) => updateItemField(item.id, 'purchasedPrice', Number(e.target.value))}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipment-charges">Shipment Charges ({currencySymbol})</Label>
                <Input
                  id="shipment-charges"
                  type="number"
                  value={parseFloat(editingOrder.shipmentcharges || '0')}
                  onChange={(e) => {
                    const newShipmentCharges = parseFloat(e.target.value) || 0;
                    setEditingOrder({
                      ...editingOrder,
                      shipmentcharges: newShipmentCharges.toString(),
                      total: editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + newShipmentCharges
                    });
                  }}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="text-lg font-semibold">
                New Total: {currencySymbol} {(editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + parseFloat(editingOrder.shipmentcharges || '0')).toFixed(2)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOrder} disabled={updatingOrder}>
              {updatingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
