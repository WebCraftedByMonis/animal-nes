'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface PendingProduct {
  id: number;
  productName: string;
  genericName: string | null;
  category: string | null;
  subCategory: string | null;
  categories: { category: string }[];
  description: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  submittedByRole: string | null;
  createdAt: string;
  image: { url: string } | null;
  company: { id: number; companyName: string | null } | null;
  partner: { id: number; partnerName: string; shopName: string | null } | null;
  variants: { id: number; packingVolume: string | null; customerPrice: number | null }[];
}

export default function ProductApprovalsPage() {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'all'>('PENDING');
  const [selected, setSelected] = useState<PendingProduct | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/product-approvals?status=${statusFilter}`);
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products);
      } else {
        toast.error('Failed to fetch product submissions');
      }
    } catch (error) {
      toast.error('An error occurred while fetching submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (productId: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !confirm('Reject this product submission?')) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/product-approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          action,
          rejectionReason: action === 'reject' ? rejectionReason || undefined : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(action === 'approve' ? 'Product approved — it’s now live.' : 'Product submission rejected.');
        setSelected(null);
        setRejectionReason('');
        fetchProducts();
      } else {
        toast.error(data.error || `Failed to ${action} this product`);
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Product Approvals</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review products submitted by companies and partners before they go live on the site.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['PENDING', 'APPROVED', 'REJECTED', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? status === 'REJECTED'
                  ? 'bg-red-500 text-white'
                  : status === 'APPROVED'
                  ? 'bg-green-500 text-white'
                  : status === 'PENDING'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-700 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <p className="text-gray-500">No product submissions found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-x-auto border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead className="bg-gray-50 dark:bg-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-700">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <Image src={product.image.url} alt={product.productName} width={36} height={36} className="rounded object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-gray-200 dark:bg-zinc-700" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.productName}</div>
                        <div className="text-xs text-gray-500">{[product.category, product.subCategory].filter(Boolean).join(' / ') || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {product.company?.companyName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {product.partner?.partnerName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.submittedByRole || 'ADMIN'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(product.approvalStatus)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setSelected(product)} className="text-green-600 hover:text-green-900">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selected.productName}</h3>
                  <p className="text-sm text-gray-500 mt-1">Product ID: {selected.id}</p>
                </div>
                <button
                  onClick={() => { setSelected(null); setRejectionReason(''); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {selected.image && (
                <Image src={selected.image.url} alt={selected.productName} width={160} height={160} className="rounded-lg object-cover border" />
              )}

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Product Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Category</p>
                    <p className="font-medium dark:text-gray-100">{[selected.category, selected.subCategory].filter(Boolean).join(' / ') || '-'}</p>
                  </div>
                  {selected.categories.length > 0 && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Also Listed Under</p>
                      <p className="font-medium dark:text-gray-100">{selected.categories.map(c => c.category).join(', ')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Generic Name</p>
                    <p className="font-medium dark:text-gray-100">{selected.genericName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Company</p>
                    <p className="font-medium dark:text-gray-100">{selected.company?.companyName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Partner</p>
                    <p className="font-medium dark:text-gray-100">{selected.partner?.partnerName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Submitted By</p>
                    <p className="font-medium dark:text-gray-100">{selected.submittedByRole || 'ADMIN'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Status</p>
                    <div>{getStatusBadge(selected.approvalStatus)}</div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 dark:text-gray-400">Submitted</p>
                    <p className="font-medium dark:text-gray-100">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {selected.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">{selected.description}</p>
                </div>
              )}

              {selected.variants.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Variants</h4>
                  <div className="space-y-1 text-sm">
                    {selected.variants.map((v) => (
                      <div key={v.id} className="flex justify-between bg-gray-50 dark:bg-zinc-800 px-3 py-2 rounded-lg">
                        <span className="text-gray-700 dark:text-gray-300">{v.packingVolume || '-'}</span>
                        <span className="font-medium dark:text-gray-100">PKR {v.customerPrice?.toFixed(2) ?? '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.rejectionReason && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Rejection Reason</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">{selected.rejectionReason}</p>
                </div>
              )}

              {selected.approvalStatus === 'PENDING' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Reason (used only if you reject)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Optional — tell the vendor why, if you reject"
                  />
                </div>
              )}

              {selected.approvalStatus === 'PENDING' && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleAction(selected.id, 'reject')}
                    disabled={processing}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleAction(selected.id, 'approve')}
                    disabled={processing}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? 'Processing...' : 'Approve & Publish'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
