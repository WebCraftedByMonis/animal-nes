'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface PaymentSettings {
  id?: number;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  jazzcashNumber: string;
  easypaisaNumber: string;
  enableCOD: boolean;
  enableBank: boolean;
  enableJazzcash: boolean;
  enableEasypaisa: boolean;
  minimumOrderAmount: number;
  policyText: string;
}

const defaultSettings: PaymentSettings = {
  bankName: '',
  accountTitle: '',
  accountNumber: '',
  jazzcashNumber: '',
  easypaisaNumber: '',
  enableCOD: false,
  enableBank: false,
  enableJazzcash: false,
  enableEasypaisa: false,
  minimumOrderAmount: 0,
  policyText: '',
};

export default function CompanyPaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/company/payment-settings');
      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
          bankName: data.settings.bankName || '',
          accountTitle: data.settings.accountTitle || '',
          accountNumber: data.settings.accountNumber || '',
          jazzcashNumber: data.settings.jazzcashNumber || '',
          easypaisaNumber: data.settings.easypaisaNumber || '',
          policyText: data.settings.policyText || '',
          minimumOrderAmount: data.settings.minimumOrderAmount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/company/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success('Payment settings saved successfully!');
      } else {
        toast.error('Failed to save payment settings');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Payment Settings</h2>
      <p className="text-sm text-gray-500">Configure payment methods that partners can use when ordering your products.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method Toggles */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-gray-900">Enabled Payment Methods</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'enableCOD', label: 'Cash on Delivery' },
              { key: 'enableBank', label: 'Bank Transfer' },
              { key: 'enableJazzcash', label: 'JazzCash' },
              { key: 'enableEasypaisa', label: 'Easypaisa' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[key as keyof PaymentSettings] as boolean}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Bank Details */}
        {settings.enableBank && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900">Bank Transfer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={settings.bankName}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                  placeholder="e.g., Bank Alfalah"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={settings.accountTitle}
                  onChange={(e) => setSettings({ ...settings, accountTitle: e.target.value })}
                  placeholder="Account holder name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={settings.accountNumber}
                  onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                  placeholder="Bank account number"
                />
              </div>
            </div>
          </div>
        )}

        {/* JazzCash */}
        {settings.enableJazzcash && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">JazzCash Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">JazzCash Number</label>
              <input
                type="text"
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.jazzcashNumber}
                onChange={(e) => setSettings({ ...settings, jazzcashNumber: e.target.value })}
                placeholder="03XX-XXXXXXX"
              />
            </div>
          </div>
        )}

        {/* Easypaisa */}
        {settings.enableEasypaisa && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Easypaisa Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Easypaisa Number</label>
              <input
                type="text"
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.easypaisaNumber}
                onChange={(e) => setSettings({ ...settings, easypaisaNumber: e.target.value })}
                placeholder="03XX-XXXXXXX"
              />
            </div>
          </div>
        )}

        {/* Minimum Order & Policy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount (PKR)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={settings.minimumOrderAmount}
              onChange={(e) => setSettings({ ...settings, minimumOrderAmount: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Policy / Instructions</label>
          <textarea
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={settings.policyText}
            onChange={(e) => setSettings({ ...settings, policyText: e.target.value })}
            placeholder="Add any payment instructions or policies for partners..."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
