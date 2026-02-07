'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import {
  Loader2, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  X, Trash2, Package, TrendingUp, Clock, CheckCircle, Truck
} from 'lucide-react';

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
  company: { id: number; companyName: string };
  city: string;
  province: string;
  address: string;
  shippingAddress: string;
  paymentMethod: string;
  paymentScreenshot: string | null;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface StatusStat {
  status: string;
  _count: { id: number };
  _sum: { total: number | null };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  shipped: 'bg-purple-100 text-purple-800 border-purple-300',
  delivered: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5 text-yellow-600" />,
  confirmed: <CheckCircle className="w-5 h-5 text-blue-600" />,
  shipped: <Truck className="w-5 h-5 text-purple-600" />,
  delivered: <Package className="w-5 h-5 text-green-600" />,
};

const allStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function AdminPartnerOrders() {
  const [orders, setOrders] = useState<PartnerOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [companies, setCompanies] = useState<{ id: number; companyName: string }[]>([]);
  const [stats, setStats] = useState<StatusStat[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(companyFilter && { companyId: companyFilter }),
      });
      const res = await fetch(`/api/admin/partner-orders?${params}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setStats(data.stats);
        if (data.companies) setCompanies(data.companies);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, companyFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/admin/partner-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        toast.success(`Order #${orderId} updated to ${newStatus}`);
        fetchOrders(); // Refresh stats
      } else {
        toast.error('Failed to update');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const deleteOrder = async (orderId: number) => {
    try {
      const res = await fetch(`/api/admin/partner-orders?id=${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Order #${orderId} deleted`);
        setDeleteConfirm(null);
        fetchOrders();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  // Stats helpers
  const getStatCount = (status: string) => stats.find(s => s.status === status)?._count?.id || 0;
  const getStatTotal = (status: string) => stats.find(s => s.status === status)?._sum?.total || 0;
  const grandTotalRevenue = stats.reduce((sum, s) => sum + (s._sum?.total || 0), 0);
  const totalOrders = stats.reduce((sum, s) => sum + s._count.id, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partner B2B Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all orders placed by partners through the B2B shop</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-green-600 font-medium">Rs.{grandTotalRevenue.toFixed(0)}</p>
        </div>
        {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(status => (
          <div key={status} className={`rounded-lg shadow-sm border p-4 ${statusColors[status]?.replace('text-', 'bg-').replace('800', '50') || 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-1">
              {statusIcons[status] || <Package className="w-4 h-4" />}
              <span className="text-xs text-gray-600 uppercase">{status}</span>
            </div>
            <p className="text-2xl font-bold">{getStatCount(status)}</p>
            <p className="text-xs text-gray-600">Rs.{getStatTotal(status).toFixed(0)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search partner name, shop, company..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {allStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          value={companyFilter}
          onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
        <button onClick={handleSearch} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setSearch(''); setStatusFilter(''); setCompanyFilter(''); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Clear
        </button>
        <span className="text-sm text-gray-500 ml-auto">{total} orders</span>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-green-500" />
          <span className="ml-2 text-gray-600">Loading orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm text-gray-500">
          No partner orders found.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Header Row */}
              <div
                className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <p className="font-semibold text-gray-900">#{order.id}</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{order.partner.partnerName}</p>
                    <p className="text-xs text-gray-500 truncate">{order.partner.shopName || order.partner.partnerEmail}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs text-blue-600 font-medium">{order.company.companyName}</p>
                    <p className="text-xs text-gray-500">{order.items.length} item(s)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[order.status] || 'bg-gray-100'}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className="text-sm font-bold text-green-700 min-w-[80px] text-right">Rs.{order.total.toFixed(0)}</span>
                  <span className="text-xs text-gray-500">{order.paymentMethod}</span>
                  {order.paymentScreenshot && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setScreenshotModal(order.paymentScreenshot); }}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200"
                    >
                      Screenshot
                    </button>
                  )}
                  {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
                  {/* Partner & Shipping */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs uppercase block mb-1">Partner</span>
                      <p className="font-medium">{order.partner.partnerName}</p>
                      <p className="text-gray-500">{order.partner.partnerEmail}</p>
                      <p className="text-gray-500">{order.partner.partnerMobileNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs uppercase block mb-1">Company</span>
                      <p className="font-medium">{order.company.companyName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs uppercase block mb-1">Shipping</span>
                      <p className="font-medium">{order.city}, {order.province}</p>
                      <p className="text-gray-500 text-xs">{order.address}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs uppercase block mb-1">Payment</span>
                      <p className="font-medium">{order.paymentMethod}</p>
                      <p className="text-green-700 font-bold">Rs.{order.total.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <span className="text-gray-500 text-xs uppercase block mb-2">Order Items</span>
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Variant</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Discount</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {order.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  {item.product.image?.url && (
                                    <div className="relative w-8 h-8 flex-shrink-0">
                                      <Image src={item.product.image.url} alt="" fill className="object-contain rounded" />
                                    </div>
                                  )}
                                  <span className="truncate max-w-[200px]">{item.product.productName}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600">{item.variant.packingVolume}</td>
                              <td className="px-3 py-2 text-sm">{item.quantity}</td>
                              <td className="px-3 py-2 text-sm">Rs.{item.price.toFixed(2)}</td>
                              <td className="px-3 py-2 text-sm">
                                {item.discountPercentage ? (
                                  <span className="text-red-500">-{item.discountPercentage}%</span>
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium">Rs.{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">Update Status:</span>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        disabled={updatingOrderId === order.id}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      >
                        {allStatuses.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      {updatingOrderId === order.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(order.id); }}
                      className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">Payment Screenshot</h3>
              <button onClick={() => setScreenshotModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative w-full" style={{ minHeight: '400px' }}>
                <Image src={screenshotModal} alt="Payment Screenshot" fill className="object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Order #{deleteConfirm}?</h3>
              <p className="text-sm text-gray-600 mb-4">This will permanently delete this order and all its items. This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={() => deleteOrder(deleteConfirm)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
