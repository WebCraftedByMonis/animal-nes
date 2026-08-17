'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface RankingSettings {
  relevanceWeight: number;
  conversionWeight: number;
  ctrWeight: number;
  salesVelocityWeight: number;
  freshnessWeight: number;
  sellerQualityWeight: number;
  reviewsWeight: number;
  explorationWeight: number;
  newProductBoostEnabled: boolean;
  newVendorBoostEnabled: boolean;
  boostDurationDays: number;
  boostMultiplier: number;
  updatedAt?: string;
}

const WEIGHT_FIELDS: { key: keyof RankingSettings; label: string; hint: string }[] = [
  { key: 'relevanceWeight', label: 'Relevance', hint: 'Recent impressions & views' },
  { key: 'conversionWeight', label: 'Conversions', hint: 'Purchases per view' },
  { key: 'ctrWeight', label: 'Click-through rate', hint: 'Clicks per impression' },
  { key: 'salesVelocityWeight', label: 'Sales velocity', hint: 'Units sold, last 30 days' },
  { key: 'freshnessWeight', label: 'Freshness', hint: 'Newer products score higher' },
  { key: 'sellerQualityWeight', label: 'Seller quality', hint: 'Premium partner standing' },
  { key: 'reviewsWeight', label: 'Reviews', hint: 'Average approved rating' },
  { key: 'explorationWeight', label: 'Exploration', hint: 'Small random boost for low-data products' },
];

export default function RankingSettingsPage() {
  const [settings, setSettings] = useState<RankingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ranking-settings');
      const data = await response.json();
      if (response.ok) {
        setSettings(data.settings);
      } else {
        toast.error('Failed to load ranking settings');
      }
    } catch (error) {
      toast.error('An error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof RankingSettings>(key: K, value: RankingSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/ranking-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        toast.success('Ranking settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const response = await fetch('/api/admin/ranking-settings/recalculate', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Recalculated ${data.updated} products' ranking scores`);
      } else {
        toast.error(data.error || 'Failed to recalculate');
      }
    } catch (error) {
      toast.error('An error occurred while recalculating');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-6 text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const totalWeight = WEIGHT_FIELDS.reduce((sum, f) => sum + (Number(settings[f.key]) || 0), 0);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ranking Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Controls the default order of the products listing and homepage. Recomputed nightly by cron, or on demand below.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Signal Weights</h2>
            <span className={`text-xs font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
              Total: {totalWeight}% {totalWeight !== 100 && '(doesn\'t need to be exactly 100 — just relative to each other)'}
            </span>
          </div>
          <div className="space-y-3">
            {WEIGHT_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-4">
                <div className="w-40 flex-shrink-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.hint}</p>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Number(settings[f.key])}
                  onChange={(e) => updateField(f.key, Number(e.target.value) as never)}
                  className="flex-1 accent-green-500"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Number(settings[f.key])}
                  onChange={(e) => updateField(f.key, Number(e.target.value) as never)}
                  className="w-16 px-2 py-1 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded text-sm text-right"
                />
                <span className="text-sm text-gray-500 w-4">%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Fair Exposure for New Vendors & Products</h2>
          <p className="text-sm text-gray-500 mb-4">
            Without this, established sellers with more sales history always outrank newcomers. A temporary boost gives new
            listings a fair chance to be seen and collect their own data.
          </p>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">New product boost</span>
              <input
                type="checkbox"
                checked={settings.newProductBoostEnabled}
                onChange={(e) => updateField('newProductBoostEnabled', e.target.checked)}
                className="h-4 w-4 accent-green-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">New vendor boost</span>
              <input
                type="checkbox"
                checked={settings.newVendorBoostEnabled}
                onChange={(e) => updateField('newVendorBoostEnabled', e.target.checked)}
                className="h-4 w-4 accent-green-500"
              />
            </label>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Boost duration (days)</span>
              <input
                type="number"
                min="1"
                value={settings.boostDurationDays}
                onChange={(e) => updateField('boostDurationDays', Number(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded text-sm text-right"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Boost multiplier</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={settings.boostMultiplier}
                onChange={(e) => updateField('boostMultiplier', Number(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 rounded text-sm text-right"
              />
            </div>
          </div>
        </div>

        {settings.updatedAt && (
          <p className="text-xs text-gray-400">Last saved {new Date(settings.updatedAt).toLocaleString()}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {recalculating ? 'Recalculating...' : 'Recalculate Now'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Save just stores the weights. Recalculate Now applies them to every product immediately — otherwise it happens
          automatically overnight.
        </p>
      </div>
    </div>
  );
}
