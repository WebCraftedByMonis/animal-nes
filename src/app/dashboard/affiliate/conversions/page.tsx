'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface Conversion {
  id: number;
  checkoutId: number;
  orderTotal: number;
  status: 'APPROVED' | 'REVERSED';
  reversalReason: string | null;
  createdAt: string;
  affiliatePartner: { id: number; name: string; email: string };
  commission: { amount: number } | null;
}

export default function AffiliateConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/affiliate/conversions?status=${statusFilter}`);
    const data = await res.json();
    if (res.ok) setConversions(data.conversions);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const reverse = async (id: number) => {
    const reason = window.prompt('Reason for reversing this conversion (e.g. order refunded):') || undefined;
    const res = await fetch('/api/admin/affiliate/conversions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reversalReason: reason }),
    });
    if (res.ok) {
      toast.success('Conversion reversed');
      load();
    } else {
      toast.error('Failed to reverse');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Conversions</h1>
        <p className="text-gray-600 mt-1">Every purchase attributed to an affiliate click. Reverse a conversion for refunded/cancelled orders.</p>
      </div>

      <div className="mb-4 flex gap-2">
        {['all', 'approved', 'reversed'].map((s) => (
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
      ) : conversions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">No conversions yet</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Order</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Affiliate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Order total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Commission</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {conversions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">#{c.checkoutId}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.affiliatePartner.name}</div>
                    <div className="text-gray-500 text-xs">{c.affiliatePartner.email}</div>
                  </td>
                  <td className="px-4 py-3">PKR {c.orderTotal.toLocaleString()}</td>
                  <td className="px-4 py-3">PKR {(c.commission?.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        c.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'APPROVED' && (
                      <button onClick={() => reverse(c.id)} className="text-red-600 hover:text-red-800 font-medium">
                        Reverse
                      </button>
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
