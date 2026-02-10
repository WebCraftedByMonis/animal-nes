'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Trash2, Download, Edit, Loader2, Search } from 'lucide-react'
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

export default function AdminOrdersPage() {
  const { country } = useCountry()
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
        params: { search: searchTerm, page: pageNum, limit: limitNum, country },
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
      <h1 className="text-3xl font-bold text-green-500">All Orders</h1>

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
                  <TableCell>{item.animal ? `PKR ${item.price?.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{item.product ? `PKR ${item.price?.toFixed(2)}` : '-'}</TableCell>

                  {idx === 0 && (
                    <>
                      <TableCell rowSpan={order.items.length} className="font-semibold">
                        PKR {order.shipmentcharges}
                      </TableCell>
                      <TableCell rowSpan={order.items.length} className="font-semibold">
                        PKR {order.total.toFixed(2)}
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
                          <Label htmlFor={`price-${item.id}`}>Selling Price (PKR)</Label>
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
                          <Label htmlFor={`purchased-price-${item.id}`}>Purchased Price (PKR)</Label>
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
                <Label htmlFor="shipment-charges">Shipment Charges (PKR)</Label>
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
                New Total: PKR {(editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + parseFloat(editingOrder.shipmentcharges || '0')).toFixed(2)}
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
