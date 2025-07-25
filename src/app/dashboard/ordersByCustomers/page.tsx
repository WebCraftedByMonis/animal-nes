'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'

interface Product {
  id: number;
  productName: string;
  genericName: string;
  // Remove customerPrice from here
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
  paymentMethod: string;
  total: number;
  status: string;
  createdAt: string;
  user: User;
  items: Item[];
}


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    axios
      .get('/api/orders', {
        params: { search, page, limit },
      })
      .then((res) => {
        setOrders(res.data.orders)
        setTotal(res.data.total)
        console.log("this is what we are looking for", res.data)
      })
      .catch((err) => console.error(err))
  }, [search, page, limit])

  // Group orders by month for chart
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
      // Re-fetch data or optimistically update
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: 'delivered' } : order
        )
      )
    } catch (err) {
      console.error('Error updating status', err)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-green-500">All Orders</h1>

      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <select
          className="border p-2 rounded"
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value))
            setPage(1)
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Buyer Name</TableHead>
              <TableHead>Buyer Email</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Shipping</TableHead>
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
              <TableHead>Order Total</TableHead>
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
                      <TableCell rowSpan={order.items.length}>{order.shippingAddress}</TableCell>
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
                    <TableCell rowSpan={order.items.length} className="font-semibold">
                      PKR {order.total.toFixed(2)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

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
    </div>
  )
}