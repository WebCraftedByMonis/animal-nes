'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface AffProduct {
  id: number;
  productName: string;
  category: string | null;
  isActive: boolean;
  enabled: boolean;
  commissionType: 'PERCENTAGE' | 'FIXED' | null;
  commissionValue: number | null;
  hasOverride: boolean;
}

export default function AffiliateProductsPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<AffProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async (q = '') => {
    setLoading(true);
    const res = await fetch(`/api/admin/affiliate/products?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (res.ok) setProducts(data.products);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const save = async (p: AffProduct, changes: Partial<AffProduct>) => {
    setSavingId(p.id);
    const merged = { ...p, ...changes };
    const res = await fetch('/api/admin/affiliate/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: p.id,
        enabled: merged.enabled,
        commissionType: merged.commissionType,
        commissionValue: merged.commissionValue,
      }),
    });
    if (res.ok) {
      toast.success('Saved');
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...merged, hasOverride: true } : x)));
    } else {
      toast.error('Failed to save');
    }
    setSavingId(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Products</h1>
        <p className="text-gray-600 mt-1">
          Every product is affiliate-eligible at the global default rate unless you set an override here,
          or disable it entirely.
        </p>
      </div>

      <input
        className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 mb-4"
        placeholder="Search products by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">
          {query ? 'No products match your search' : 'Search for a product, or products with an existing override will appear here'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Product</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Enabled</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Commission override</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.productName}</div>
                    <div className="text-gray-400 text-xs">{p.category}</div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) =>
                        setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: e.target.checked } : x)))
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <select
                        className="border border-gray-300 rounded px-2 py-1"
                        value={p.commissionType || ''}
                        onChange={(e) =>
                          setProducts((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, commissionType: (e.target.value || null) as 'PERCENTAGE' | 'FIXED' | null } : x))
                          )
                        }
                      >
                        <option value="">Default rate</option>
                        <option value="PERCENTAGE">%</option>
                        <option value="FIXED">Flat PKR</option>
                      </select>
                      {p.commissionType && (
                        <input
                          type="number"
                          className="w-24 border border-gray-300 rounded px-2 py-1"
                          value={p.commissionValue ?? ''}
                          onChange={(e) =>
                            setProducts((prev) =>
                              prev.map((x) => (x.id === p.id ? { ...x, commissionValue: e.target.value === '' ? null : Number(e.target.value) } : x))
                            )
                          }
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => save(p, {})}
                      disabled={savingId === p.id}
                      className="text-green-600 hover:text-green-800 font-medium disabled:text-gray-400"
                    >
                      {savingId === p.id ? 'Saving…' : 'Save'}
                    </button>
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
