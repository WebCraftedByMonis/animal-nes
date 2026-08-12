'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import WhatsAppLink from '@/components/WhatsAppLink';

interface VendorRow {
  companyId: number;
  companyName: string;
  email: string | null;
  mobileNumber: string | null;
  balance: number;
  lastPayoutAt: string | null;
}

interface LedgerEntry {
  id: number;
  type: 'SALE' | 'PAYOUT' | 'ADJUSTMENT';
  amount: number;
  notes: string | null;
  createdAt: string;
  checkoutItemId: number | null;
  checkoutItem?: {
    id: number;
    checkoutId: number;
    quantity: number;
    product: { productName: string } | null;
  } | null;
}

export default function VendorPayoutsPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VendorRow | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/vendor-payouts');
      const data = await response.json();
      if (response.ok) {
        setVendors(data.vendors);
      } else {
        toast.error('Failed to fetch vendor balances');
      }
    } catch (error) {
      toast.error('An error occurred while fetching vendor balances');
    } finally {
      setLoading(false);
    }
  };

  const openVendor = async (vendor: VendorRow) => {
    setSelected(vendor);
    setPayoutAmount('');
    setPayoutNotes('');
    setLedgerLoading(true);
    try {
      const response = await fetch(`/api/admin/vendor-payouts/${vendor.companyId}`);
      const data = await response.json();
      if (response.ok) {
        setLedger(data.entries);
      } else {
        toast.error('Failed to load ledger');
      }
    } catch (error) {
      toast.error('An error occurred while loading the ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleRecordPayout = async () => {
    if (!selected) return;
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payout amount');
      return;
    }
    if (amount > selected.balance) {
      if (!confirm(`This is more than the PKR ${selected.balance.toFixed(2)} currently owed. Record it anyway?`)) return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/vendor-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selected.companyId, amount, notes: payoutNotes || undefined }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Payout recorded');
        setPayoutAmount('');
        setPayoutNotes('');
        await Promise.all([fetchVendors(), openVendor(selected)]);
      } else {
        toast.error(data.error || 'Failed to record payout');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      SALE: 'bg-blue-100 text-blue-800',
      PAYOUT: 'bg-green-100 text-green-800',
      ADJUSTMENT: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vendor Payouts</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          What you owe each company for items sold, derived from the sale ledger — never a stored number.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <p className="text-gray-500">No vendor sales recorded yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-x-auto border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead className="bg-gray-50 dark:bg-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Paid</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Owed</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-700">
              {vendors.map((v) => (
                <tr key={v.companyId} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{v.companyName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    <div>{v.email || '-'}</div>
                    <WhatsAppLink phone={v.mobileNumber || ''} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {v.lastPayoutAt ? new Date(v.lastPayoutAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                    PKR {v.balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openVendor(v)} className="text-green-600 hover:text-green-900">
                      View Ledger
                    </button>
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selected.companyName}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Owed: <span className="font-bold text-gray-900 dark:text-gray-100">PKR {selected.balance.toFixed(2)}</span>
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Record a Payout</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Amount (PKR)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <input
                    type="text"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder="Reference / notes (optional)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    onClick={handleRecordPayout}
                    disabled={processing}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {processing ? 'Saving...' : 'Record Payout'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This only logs that money left the business — it doesn&apos;t send anything. Pay the vendor through your usual channel first.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Ledger</h4>
                {ledgerLoading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : ledger.length === 0 ? (
                  <p className="text-sm text-gray-500">No entries yet</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {ledger.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-zinc-800 pb-2">
                        <div>
                          {typeBadge(entry.type)}
                          <span className="ml-2 text-gray-700 dark:text-gray-300">
                            {entry.checkoutItem
                              ? `${entry.checkoutItem.product?.productName || 'Item'} — Order #${entry.checkoutItem.checkoutId}`
                              : entry.notes || entry.type}
                          </span>
                          <div className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</div>
                        </div>
                        <span className={`font-semibold ${entry.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {entry.amount < 0 ? '-' : '+'}PKR {Math.abs(entry.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
