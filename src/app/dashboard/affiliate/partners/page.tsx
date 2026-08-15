'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface AffPartner {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  referralCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  commissionType: 'PERCENTAGE' | 'FIXED' | null;
  commissionValue: number | null;
  balance: number;
  _count: { links: number; clicks: number; conversions: number };
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-gray-200 text-gray-700',
};

export default function AffiliatePartnersPage() {
  const [partners, setPartners] = useState<AffPartner[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AffPartner | null>(null);
  const [commissionType, setCommissionType] = useState('');
  const [commissionValue, setCommissionValue] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/affiliate/partners?status=${statusFilter}`);
    const data = await res.json();
    if (res.ok) setPartners(data.partners);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const act = async (id: number, action: 'approve' | 'reject' | 'suspend') => {
    const res = await fetch('/api/admin/affiliate/partners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      toast.success(`Affiliate ${action}d`);
      load();
    } else {
      toast.error('Action failed');
    }
  };

  const saveCommission = async () => {
    if (!editing) return;
    const res = await fetch('/api/admin/affiliate/partners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        commissionType: commissionType || null,
        commissionValue: commissionValue || null,
      }),
    });
    if (res.ok) {
      toast.success('Commission override saved');
      setEditing(null);
      load();
    } else {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Partners</h1>
        <p className="text-gray-600 mt-1">Approve applications and set per-affiliate commission overrides.</p>
      </div>

      <div className="mb-4 flex gap-2">
        {['all', 'pending', 'approved', 'rejected', 'suspended'].map((s) => (
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
      ) : partners.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">No affiliates found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Affiliate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Commission</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Links / Clicks / Conv.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Balance</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-gray-500 text-xs">{p.email}</div>
                    <div className="text-gray-400 text-xs">{p.referralCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.commissionType
                      ? `${p.commissionValue}${p.commissionType === 'PERCENTAGE' ? '%' : ' PKR flat'} (override)`
                      : 'Default'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p._count.links} / {p._count.clicks} / {p._count.conversions}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">PKR {p.balance.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {p.status === 'PENDING' && (
                      <>
                        <button onClick={() => act(p.id, 'approve')} className="text-green-600 hover:text-green-800 font-medium">Approve</button>
                        <button onClick={() => act(p.id, 'reject')} className="text-red-600 hover:text-red-800 font-medium">Reject</button>
                      </>
                    )}
                    {p.status === 'APPROVED' && (
                      <button onClick={() => act(p.id, 'suspend')} className="text-red-600 hover:text-red-800 font-medium">Suspend</button>
                    )}
                    {p.status === 'SUSPENDED' && (
                      <button onClick={() => act(p.id, 'approve')} className="text-green-600 hover:text-green-800 font-medium">Reinstate</button>
                    )}
                    <button
                      onClick={() => {
                        setEditing(p);
                        setCommissionType(p.commissionType || '');
                        setCommissionValue(p.commissionValue?.toString() || '');
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Set commission
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Commission override — {editing.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value)}
                >
                  <option value="">Use global default</option>
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </div>
              {commissionType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={saveCommission} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
