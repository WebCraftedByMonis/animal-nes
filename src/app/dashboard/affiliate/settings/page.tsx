'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface Settings {
  defaultCommissionType: 'PERCENTAGE' | 'FIXED';
  defaultCommissionValue: number;
  cookieWindowDays: number;
  minPayoutAmount: number;
}

export default function AffiliateSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/affiliate/settings')
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/affiliate/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success('Affiliate settings updated');
      } else {
        toast.error('Failed to update settings');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Settings</h1>
        <p className="text-gray-600 mt-1">
          These defaults decide the commission every affiliate earns unless a specific product or
          affiliate has its own override. Nothing about commission is hardcoded in the app.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default commission type</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={settings.defaultCommissionType}
            onChange={(e) => setSettings({ ...settings, defaultCommissionType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
          >
            <option value="PERCENTAGE">Percentage of order value</option>
            <option value="FIXED">Fixed amount per order</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default commission value {settings.defaultCommissionType === 'PERCENTAGE' ? '(%)' : '(PKR)'}
          </label>
          <input
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={settings.defaultCommissionValue}
            onChange={(e) => setSettings({ ...settings, defaultCommissionValue: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attribution cookie window (days)</label>
          <input
            type="number"
            min={1}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={settings.cookieWindowDays}
            onChange={(e) => setSettings({ ...settings, cookieWindowDays: Number(e.target.value) })}
          />
          <p className="text-xs text-gray-500 mt-1">
            How long after a click a purchase still counts as referred by that affiliate.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minimum payout amount (PKR)</label>
          <input
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={settings.minPayoutAmount}
            onChange={(e) => setSettings({ ...settings, minPayoutAmount: Number(e.target.value) })}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:bg-gray-400"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
