'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface Payout {
  id: number;
  amount: number;
  accountTitle: string;
  accountNumber: string;
  bankName: string;
  paymentMethod: string;
  status: string;
  notes: string | null;
  createdAt: string;
  affiliatePartner: { id: number; name: string; email: string };
}

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AffiliatePayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/affiliate/payouts?status=${statusFilter}`);
    const data = await res.json();
    if (res.ok) setPayouts(data.payouts);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this payout?`)) return;
    setProcessing(id);
    try {
      const res = await fetch('/api/admin/affiliate/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Payout ${action}d`);
        load();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Payouts</h1>
        <p className="text-gray-600 mt-1">Approving a payout deducts it from the affiliate&apos;s ledger balance.</p>
      </div>

      <div className="mb-4 flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              statusFilter === s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : payouts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">No payout requests found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Affiliate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Account</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.affiliatePartner.name}</div>
                    <div className="text-gray-500 text-xs">{p.affiliatePartner.email}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">PKR {p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>{p.accountTitle} — {p.accountNumber}</div>
                    <div className="text-xs text-gray-500">{p.bankName} ({p.paymentMethod})</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {p.status === 'pending' && (
                      <>
                        <button
                          onClick={() => act(p.id, 'reject')}
                          disabled={processing === p.id}
                          className="text-red-600 hover:text-red-800 font-medium disabled:text-gray-400"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => act(p.id, 'approve')}
                          disabled={processing === p.id}
                          className="text-green-600 hover:text-green-800 font-medium disabled:text-gray-400"
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
