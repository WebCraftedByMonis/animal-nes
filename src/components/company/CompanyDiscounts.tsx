'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Trash2, Edit, X, Plus } from 'lucide-react';

interface DiscountProduct {
  id: number;
  productName: string;
  variants: { id: number; packingVolume: string }[];
}

interface Discount {
  id: number;
  name: string;
  percentage: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  companyId: number | null;
  productId: number | null;
  variantId: number | null;
  product?: { id: number; productName: string } | null;
  variant?: { id: number; packingVolume: string } | null;
}

const defaultForm = {
  name: '',
  percentage: '',
  startDate: '',
  endDate: '',
  isActive: true,
  scope: 'company' as 'company' | 'product' | 'variant',
  productId: '' as string | number,
  variantId: '' as string | number,
};

export default function CompanyDiscounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<DiscountProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const res = await fetch('/api/company/discounts');
      const data = await res.json();
      if (res.ok) {
        setDiscounts(data.discounts);
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        productId: form.productId ? Number(form.productId) : null,
        variantId: form.variantId ? Number(form.variantId) : null,
      };

      if (editingId) {
        const res = await fetch('/api/company/discounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        if (res.ok) {
          toast.success('Discount updated!');
          resetForm();
          fetchDiscounts();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to update');
        }
      } else {
        const res = await fetch('/api/company/discounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success('Discount created!');
          resetForm();
          fetchDiscounts();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to create');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingId(discount.id);
    setForm({
      name: discount.name,
      percentage: String(discount.percentage),
      startDate: discount.startDate.split('T')[0],
      endDate: discount.endDate.split('T')[0],
      isActive: discount.isActive,
      scope: discount.variantId ? 'variant' : discount.productId ? 'product' : 'company',
      productId: discount.productId || '',
      variantId: discount.variantId || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;
    try {
      const res = await fetch(`/api/company/discounts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Discount deleted');
        fetchDiscounts();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(false);
  };

  const selectedProduct = products.find(p => p.id === Number(form.productId));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading discounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Discount Management</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Discount
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">{editingId ? 'Edit' : 'Create'} Discount</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            {!editingId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value as any, productId: '', variantId: '' })}
                  >
                    <option value="company">Company-wide (all products)</option>
                    <option value="product">Specific Product</option>
                    <option value="variant">Specific Variant</option>
                  </select>
                </div>

                {(form.scope === 'product' || form.scope === 'variant') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={form.productId}
                      onChange={(e) => setForm({ ...form, productId: e.target.value, variantId: '' })}
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.productName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.scope === 'variant' && selectedProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={form.variantId}
                      onChange={(e) => setForm({ ...form, variantId: e.target.value })}
                    >
                      <option value="">Select Variant</option>
                      {selectedProduct.variants.map(v => (
                        <option key={v.id} value={v.id}>{v.packingVolume}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {discounts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow text-gray-500">No discounts created yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {discounts.map((d) => {
                const now = new Date();
                const isExpired = new Date(d.endDate) < now;
                const isUpcoming = new Date(d.startDate) > now;
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{d.percentage}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {d.variant ? `Variant: ${d.variant.packingVolume}` : d.product ? `Product: ${d.product.productName}` : 'Company-wide'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(d.startDate).toLocaleDateString()} - {new Date(d.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {!d.isActive ? (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">Inactive</span>
                      ) : isExpired ? (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Expired</span>
                      ) : isUpcoming ? (
                        <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">Upcoming</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(d)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
