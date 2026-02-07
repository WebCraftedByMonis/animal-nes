'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Loader2, Search, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  product: { id: number; productName: string; image?: { url: string; alt: string } | null };
  variant: { id: number; packingVolume: string };
}

interface PartnerOrderData {
  id: number;
  partner: {
    id: number;
    partnerName: string;
    partnerEmail: string;
    partnerMobileNumber: string | null;
    shopName: string | null;
  };
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

const statusFlow = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function CompanyPartnerOrders() {
  const [orders, setOrders] = useState<PartnerOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/company/partner-orders?${params}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/company/partner-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (res.ok) {
        setOrders(prev => prev.map(o =>
          o.id === orderId ? { ...o, status: newStatus } : o
        ));
        toast.success(`Order #${orderId} updated to ${newStatus}`);
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Partner Orders</h2>
        <span className="text-sm text-gray-500">{total} orders</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by partner name, email, shop..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {statusFlow.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm text-gray-500">
          No partner orders found.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div
                className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.partner.partnerName}</p>
                    <p className="text-xs text-gray-500">{order.partner.shopName || order.partner.partnerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className="font-bold text-green-700">Rs.{order.total.toFixed(2)}</span>
                  {order.paymentScreenshot && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setScreenshotModal(order.paymentScreenshot); }}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      View Screenshot
                    </button>
                  )}
                  {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                  {/* Partner & Shipping Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Partner:</span>
                      <p className="font-medium">{order.partner.partnerName}</p>
                      <p className="text-gray-500">{order.partner.partnerMobileNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Payment:</span>
                      <p className="font-medium">{order.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Shipping:</span>
                      <p className="font-medium">{order.city}, {order.province}</p>
                      <p className="text-gray-500 text-xs">{order.address}</p>
                    </div>
                  </div>

                  {/* Items */}
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
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{item.product.productName}</p>
                            <p className="text-xs text-gray-500">{item.variant.packingVolume} x{item.quantity}</p>
                          </div>
                          <p className="text-sm font-medium">Rs.{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="border-t pt-3 flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Update Status:</span>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      disabled={updatingOrderId === order.id}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {statusFlow.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                    {updatingOrderId === order.id && <Loader2 className="w-4 h-4 animate-spin" />}
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
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Screenshot Modal */}
      {screenshotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setScreenshotModal(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">Payment Screenshot</h3>
              <button onClick={() => setScreenshotModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative w-full" style={{ minHeight: '300px' }}>
                <Image src={screenshotModal} alt="Payment Screenshot" fill className="object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
