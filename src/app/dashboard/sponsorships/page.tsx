'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface Sponsorship {
  id: number;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'REJECTED' | 'CANCELLED';
  durationDays: number;
  amount: number;
  paymentMethod: string | null;
  paymentScreenshotUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  rejectionReason: string | null;
  requestedByRole: string;
  createdAt: string;
  product: { id: number; productName: string; image: { url: string } | null };
  company: { id: number; companyName: string | null } | null;
  partner: { id: number; partnerName: string; shopName: string | null } | null;
}

const STATUS_FILTERS = ['PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'REJECTED', 'all'] as const;

export default function SponsorshipsPage() {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('PENDING_PAYMENT');
  const [selected, setSelected] = useState<Sponsorship | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSponsorships();
  }, [statusFilter]);

  const fetchSponsorships = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/sponsorships?status=${statusFilter}`);
      const data = await response.json();
      if (response.ok) {
        setSponsorships(data.sponsorships);
      } else {
        toast.error('Failed to fetch sponsorship requests');
      }
    } catch {
      toast.error('An error occurred while fetching requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (sponsorshipId: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !confirm('Reject this sponsorship request?')) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/sponsorships', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorshipId,
          action,
          rejectionReason: action === 'reject' ? rejectionReason || undefined : undefined,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(action === 'approve' ? 'Sponsorship approved — it’s now live and logged in Finance.' : 'Sponsorship rejected.');
        setSelected(null);
        setRejectionReason('');
        fetchSponsorships();
      } else {
        toast.error(data.error || `Failed to ${action} this request`);
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-gray-100 text-gray-700',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sponsored Products</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review vendor requests to pay for a promotional boost. Approving logs the payment straight into Finance.
        </p>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? status === 'REJECTED' || status === 'CANCELLED'
                  ? 'bg-red-500 text-white'
                  : status === 'ACTIVE'
                  ? 'bg-green-500 text-white'
                  : status === 'PENDING_PAYMENT'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-700 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><p className="text-gray-500">Loading...</p></div>
      ) : sponsorships.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <p className="text-gray-500">No sponsorship requests found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-x-auto border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead className="bg-gray-50 dark:bg-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-700">
              {sponsorships.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {s.product.image ? (
                        <Image src={s.product.image.url} alt={s.product.productName} width={36} height={36} className="rounded object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-gray-200 dark:bg-zinc-700" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.product.productName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {s.company?.companyName || s.partner?.partnerName || '-'}
                    <div className="text-xs text-gray-500">{s.requestedByRole}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{s.durationDays} days</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">{s.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(s.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setSelected(s)} className="text-green-600 hover:text-green-900">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selected.product.productName}</h3>
                  <p className="text-sm text-gray-500 mt-1">Request ID: {selected.id}</p>
                </div>
                <button onClick={() => { setSelected(null); setRejectionReason(''); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Request Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Vendor</p>
                    <p className="font-medium dark:text-gray-100">{selected.company?.companyName || selected.partner?.partnerName || '-'} ({selected.requestedByRole})</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Duration</p>
                    <p className="font-medium dark:text-gray-100">{selected.durationDays} days</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Amount</p>
                    <p className="font-medium dark:text-gray-100">{selected.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Payment Method</p>
                    <p className="font-medium dark:text-gray-100">{selected.paymentMethod || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Status</p>
                    <div>{getStatusBadge(selected.status)}</div>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Requested</p>
                    <p className="font-medium dark:text-gray-100">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                  {selected.startDate && (
                    <div className="col-span-2">
                      <p className="text-gray-600 dark:text-gray-400">Active Window</p>
                      <p className="font-medium dark:text-gray-100">
                        {new Date(selected.startDate).toLocaleDateString()} — {selected.endDate ? new Date(selected.endDate).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selected.paymentScreenshotUrl && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Payment Screenshot</h4>
                  <Image src={selected.paymentScreenshotUrl} alt="Payment screenshot" width={300} height={300} className="rounded-lg border object-contain" />
                </div>
              )}

              {selected.rejectionReason && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Rejection Reason</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">{selected.rejectionReason}</p>
                </div>
              )}

              {selected.status === 'PENDING_PAYMENT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Reason (used only if you reject)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Optional — e.g. payment screenshot unclear or amount doesn't match"
                  />
                </div>
              )}

              {selected.status === 'PENDING_PAYMENT' && (
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
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? 'Processing...' : 'Approve & Go Live'}
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
