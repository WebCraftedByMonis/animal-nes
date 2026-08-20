'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface SponsorshipSettings {
  pricePerDay: number;
  pricePerDayAED: number;
  minDays: number;
  maxDays: number;
  rankingBoostMultiplier: number;
  paymentInstructions: string | null;
  jazzcashNumber: string | null;
  easypaisaNumber: string | null;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  updatedAt?: string;
}

export default function SponsorshipSettingsPage() {
  const [settings, setSettings] = useState<SponsorshipSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/sponsorship-settings')
      .then((res) => res.json())
      .then((data) => setSettings(data.settings))
      .catch(() => toast.error('Failed to load sponsorship settings'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = <K extends keyof SponsorshipSettings>(key: K, value: SponsorshipSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/sponsorship-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        toast.success('Sponsorship settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-6 text-center py-12"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sponsorship Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Pricing, duration limits, and the payment details vendors see when they request to boost a product.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Price per day (PKR)</label>
              <input
                type="number" min="0"
                value={settings.pricePerDay}
                onChange={(e) => updateField('pricePerDay', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Price per day (AED)</label>
              <input
                type="number" min="0"
                value={settings.pricePerDayAED}
                onChange={(e) => updateField('pricePerDayAED', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Minimum days</label>
              <input
                type="number" min="1"
                value={settings.minDays}
                onChange={(e) => updateField('minDays', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Maximum days</label>
              <input
                type="number" min="1"
                value={settings.maxDays}
                onChange={(e) => updateField('maxDays', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Ranking Boost</h2>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Score multiplier while a sponsorship is active
            </label>
            <input
              type="number" min="1" step="0.1"
              value={settings.rankingBoostMultiplier}
              onChange={(e) => updateField('rankingBoostMultiplier', Number(e.target.value))}
              className="w-32 px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Stacks with the new-product/new-vendor boost — takes effect the next time rankings recalculate.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Payment Details Shown to Vendors</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Instructions</label>
              <textarea
                value={settings.paymentInstructions || ''}
                onChange={(e) => updateField('paymentInstructions', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg"
                placeholder="e.g. Transfer the total amount, then upload your receipt below."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">JazzCash Number</label>
                <input value={settings.jazzcashNumber || ''} onChange={(e) => updateField('jazzcashNumber', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Easypaisa Number</label>
                <input value={settings.easypaisaNumber || ''} onChange={(e) => updateField('easypaisaNumber', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                <input value={settings.bankName || ''} onChange={(e) => updateField('bankName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Account Title</label>
                <input value={settings.accountTitle || ''} onChange={(e) => updateField('accountTitle', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                <input value={settings.accountNumber || ''} onChange={(e) => updateField('accountNumber', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {settings.updatedAt && (
          <p className="text-xs text-gray-400">Last saved {new Date(settings.updatedAt).toLocaleString()}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
