'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  product: { id: number; productName: string; image?: { url: string; alt: string } | null };
  variant: { id: number; packingVolume: string };
}

interface Order {
  id: number;
  companyId: number;
  company: { id: number; companyName: string };
  city: string;
  province: string;
  address: string;
  paymentMethod: string;
  paymentScreenshot: string | null;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
};

export default function PartnerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/partner/shop/orders?page=${page}&limit=10`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-600">My Shop Orders</h2>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No orders yet</p>
          <p className="text-gray-400 text-sm mt-1">Orders placed through the shop will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm text-blue-600">{order.company.companyName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className="font-bold text-green-700">Rs.{order.total.toFixed(2)}</span>
                  {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="border-t border-gray-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Payment:</span>
                      <p className="font-medium">{order.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">City:</span>
                      <p className="font-medium">{order.city}, {order.province}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Address:</span>
                      <p className="font-medium">{order.address}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="relative w-10 h-10 bg-gray-100 rounded flex-shrink-0">
                            {item.product.image?.url ? (
                              <Image src={item.product.image.url} alt="" fill className="object-contain p-1 rounded" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-[8px]">N/A</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{item.product.productName}</p>
                            <p className="text-xs text-gray-500">{item.variant.packingVolume} x{item.quantity}</p>
                          </div>
                          <div className="text-right">
                            {item.discountPercentage && (
                              <p className="text-xs text-red-500">-{item.discountPercentage}%</p>
                            )}
                            <p className="text-sm font-medium">Rs.{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
