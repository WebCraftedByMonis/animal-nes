'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import { Download, Edit, Loader2, Save, Search, X, FileText } from 'lucide-react';

interface ProductVariant {
  id: number;
  packingVolume: string;
  companyPrice: number | null;
  dealerPrice: number | null;
  customerPrice: number;
  inventory: number;
}

interface Product {
  id: number;
  productName: string;
  genericName: string | null;
  productLink: string | null;
  category: string;
  subCategory: string;
  description: string | null;
  dosage: string | null;
  isActive: boolean;
  outofstock: boolean;
  image?: {
    url: string;
    alt: string;
  };
  variants?: ProductVariant[];
}

interface Company {
  id: number;
  companyName: string | null;
  email: string | null;
  mobileNumber: string | null;
  address: string | null;
  image?: {
    url: string;
    alt: string;
  } | null;
  products?: Product[];
}

interface CompanyOrder {
  orderId: number;
  itemId: number;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  city: string;
  province: string;
  address: string;
  mobileNumber: string;
  productName: string;
  partnerName: string;
  variant: string;
  quantity: number;
  sellingPrice: number;
  purchasedPrice: number | null;
  status: string;
  paymentMethod: string;
}

export default function CompanyDashboard() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'profile' | 'password'>('products');

  // Orders state
  const [orders, setOrders] = useState<CompanyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(10);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editedPurchasedPrice, setEditedPurchasedPrice] = useState<number>(0);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);

  // Product variant editing state
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [editedCompanyPrice, setEditedCompanyPrice] = useState<number>(0);
  const [updatingVariantId, setUpdatingVariantId] = useState<number | null>(null);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/company/check-auth');
      const data = await response.json();

      if (response.ok && data.authenticated) {
        setCompany(data.company);
      } else {
        router.push('/company/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/company/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = useCallback(async (searchTerm = '', pageNum = ordersPage, limitNum = ordersLimit) => {
    setOrdersLoading(true);
    try {
      const response = await fetch(`/api/company/orders?search=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${limitNum}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders);
        setOrdersTotal(data.total);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage, ordersLimit]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders('', 1, ordersLimit);
    }
  }, [activeTab, ordersLimit]);

  useEffect(() => {
    if (activeTab === 'orders' && ordersPage > 1) {
      fetchOrders(ordersSearch, ordersPage, ordersLimit);
    }
  }, [ordersPage]);

  const handleOrdersSearch = () => {
    setOrdersPage(1);
    fetchOrders(ordersSearch, 1, ordersLimit);
  };

  const resetOrdersFilters = () => {
    setOrdersSearch('');
    setOrdersPage(1);
    fetchOrders('', 1, ordersLimit);
  };

  const handleEditClick = (itemId: number, currentPrice: number | null) => {
    setEditingItemId(itemId);
    setEditedPurchasedPrice(currentPrice || 0);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditedPurchasedPrice(0);
  };

  const handleSavePrice = async (itemId: number) => {
    setUpdatingItemId(itemId);
    try {
      const response = await fetch('/api/company/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, purchasedPrice: editedPurchasedPrice })
      });

      if (response.ok) {
        setOrders(prev => prev.map(order =>
          order.itemId === itemId
            ? { ...order, purchasedPrice: editedPurchasedPrice }
            : order
        ));
        toast.success('Purchased price updated successfully!');
        setEditingItemId(null);
      } else {
        toast.error('Failed to update purchased price');
      }
    } catch (error) {
      console.error('Error updating purchased price:', error);
      toast.error('Failed to update purchased price');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const downloadInvoice = (orderId: number, branded: boolean = false) => {
    // Use vendor invoice API for company dashboard
    const url = branded
      ? `/api/company/orders/${orderId}/invoice?branded=true`
      : `/api/company/orders/${orderId}/invoice`;
    window.open(url, '_blank');
  };

  const handleVariantEditClick = (variantId: number, currentPrice: number | null) => {
    setEditingVariantId(variantId);
    setEditedCompanyPrice(currentPrice || 0);
  };

  const handleVariantCancelEdit = () => {
    setEditingVariantId(null);
    setEditedCompanyPrice(0);
  };

  const handleSaveVariantPrice = async (variantId: number, productId: number) => {
    setUpdatingVariantId(variantId);
    try {
      const response = await fetch('/api/company/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, companyPrice: editedCompanyPrice })
      });

      if (response.ok) {
        // Update local state
        setCompany(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            products: prev.products?.map(product =>
              product.id === productId
                ? {
                    ...product,
                    variants: product.variants?.map(v =>
                      v.id === variantId ? { ...v, companyPrice: editedCompanyPrice } : v
                    )
                  }
                : product
            )
          };
        });
        toast.success('Company price updated successfully!');
        setEditingVariantId(null);
      } else {
        toast.error('Failed to update company price');
      }
    } catch (error) {
      console.error('Error updating company price:', error);
      toast.error('Failed to update company price');
    } finally {
      setUpdatingVariantId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/company/logout', { method: 'POST' });
      router.push('/company/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      toast.error('Password change functionality coming soon!');
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return null;
  }

  const ordersTotalPages = Math.ceil(ordersTotal / ordersLimit);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {company.image?.url && (
                <Image
                  src={company.image.url}
                  alt={company.image.alt || 'Company logo'}
                  width={50}
                  height={50}
                  className="rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {company.companyName || 'Company Dashboard'}
                </h1>
                <p className="text-sm text-gray-500">{company.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Products ({company.products?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'orders'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Company Profile
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Your Products</h2>
              <p className="text-sm text-gray-500">Edit company price (purchased price) for each variant</p>
            </div>

            {!company.products || company.products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {company.products.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* Product Image */}
                      {product.image?.url && (
                        <div className="relative w-full md:w-48 h-48 bg-gray-100 flex-shrink-0">
                          <Image
                            src={product.image.url}
                            alt={product.image.alt || product.productName}
                            fill
                            className="object-contain p-4"
                          />
                        </div>
                      )}

                      {/* Product Info & Variants */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900">
                              {product.productName}
                            </h3>
                            {product.genericName && (
                              <p className="text-sm text-gray-600">{product.genericName}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {product.category}
                            </span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              product.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        {/* Variants Table */}
                        {product.variants && product.variants.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company Price</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dealer Price</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer Price</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inventory</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {product.variants.map((variant) => (
                                  <tr key={variant.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{variant.packingVolume}</td>
                                    <td className="px-3 py-2 text-sm">
                                      {editingVariantId === variant.id ? (
                                        <input
                                          type="number"
                                          value={editedCompanyPrice}
                                          onChange={(e) => setEditedCompanyPrice(Number(e.target.value))}
                                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                          min="0"
                                          step="0.01"
                                          autoFocus
                                        />
                                      ) : (
                                        <span className={variant.companyPrice ? 'font-semibold text-blue-600' : 'text-gray-400'}>
                                          {variant.companyPrice ? `PKR ${variant.companyPrice.toFixed(2)}` : 'Not Set'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">
                                      {variant.dealerPrice ? `PKR ${variant.dealerPrice.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">
                                      PKR {variant.customerPrice.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">{variant.inventory}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <div className="flex items-center gap-1">
                                        {editingVariantId === variant.id ? (
                                          <>
                                            <button
                                              onClick={() => handleSaveVariantPrice(variant.id, product.id)}
                                              disabled={updatingVariantId === variant.id}
                                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                                              title="Save"
                                            >
                                              {updatingVariantId === variant.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                              ) : (
                                                <Save className="w-4 h-4" />
                                              )}
                                            </button>
                                            <button
                                              onClick={handleVariantCancelEdit}
                                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                                              title="Cancel"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            onClick={() => handleVariantEditClick(variant.id, variant.companyPrice)}
                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                            title="Edit Company Price"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No variants available</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Orders for Your Products</h2>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by product, customer..."
                    value={ordersSearch}
                    onChange={(e) => setOrdersSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleOrdersSearch()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <button
                  onClick={handleOrdersSearch}
                  disabled={ordersLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={resetOrdersFilters}
                  disabled={ordersLoading}
                  className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
                >
                  Clear
                </button>
              </div>

              <select
                className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500"
                value={ordersLimit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setOrdersLimit(newLimit);
                  setOrdersPage(1);
                }}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>Show {n}</option>
                ))}
              </select>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              {ordersLoading && (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin inline-block text-green-600" />
                  <span className="ml-2 text-gray-600">Loading orders...</span>
                </div>
              )}

              {!ordersLoading && orders.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No orders found for your products yet.
                </div>
              )}

              {!ordersLoading && orders.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchased Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={`${order.orderId}-${order.itemId}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono">{order.orderId}</td>
                        <td className="px-4 py-3 text-sm">{new Date(order.orderDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <div>{order.customerName}</div>
                          <div className="text-xs text-gray-500">{order.mobileNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{order.city}, {order.province}</td>
                        <td className="px-4 py-3 text-sm font-medium">{order.productName}</td>
                        <td className="px-4 py-3 text-sm">{order.variant}</td>
                        <td className="px-4 py-3 text-sm">{order.quantity}</td>
                        <td className="px-4 py-3 text-sm font-semibold">PKR {order.sellingPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">
                          {editingItemId === order.itemId ? (
                            <input
                              type="number"
                              value={editedPurchasedPrice}
                              onChange={(e) => setEditedPurchasedPrice(Number(e.target.value))}
                              className="w-28 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                          ) : (
                            <span className={order.purchasedPrice ? 'font-semibold text-green-600' : 'text-gray-400'}>
                              {order.purchasedPrice ? `PKR ${order.purchasedPrice.toFixed(2)}` : 'Not Set'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.status === 'delivered'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            {editingItemId === order.itemId ? (
                              <>
                                <button
                                  onClick={() => handleSavePrice(order.itemId)}
                                  disabled={updatingItemId === order.itemId}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Save"
                                >
                                  {updatingItemId === order.itemId ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <Save className="w-5 h-5" />
                                  )}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditClick(order.itemId, order.purchasedPrice)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit Purchased Price"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => downloadInvoice(order.orderId, false)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Download Invoice"
                                >
                                  <FileText className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => downloadInvoice(order.orderId, true)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Download Branded Invoice"
                                >
                                  <Download className="w-5 h-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!ordersLoading && orders.length > 0 && (
              <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
                <button
                  disabled={ordersPage === 1 || ordersLoading}
                  onClick={() => setOrdersPage((p) => Math.max(p - 1, 1))}
                  className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {ordersPage} of {ordersTotalPages} - Total: {ordersTotal} orders
                </span>
                <button
                  disabled={ordersPage === ordersTotalPages || ordersLoading}
                  onClick={() => setOrdersPage((p) => Math.min(p + 1, ordersTotalPages))}
                  className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <p className="mt-1 text-gray-900">{company.companyName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{company.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                <p className="mt-1 text-gray-900">{company.mobileNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-gray-900">{company.address || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
