'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Loader2, ArrowLeft, Upload, AlertCircle } from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import { formatPrice } from '@/lib/currency-utils';

interface CartItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    productName: string;
    image?: { url: string; alt: string } | null;
    company?: { id: number; companyName: string } | null;
    discounts: { percentage: number; variantId: number | null; productId: number | null }[];
  };
  variant: {
    id: number;
    packingVolume: string;
    companyPrice: number | null;
    customerPrice: number;
  };
}

interface PaymentSettings {
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  jazzcashNumber: string | null;
  easypaisaNumber: string | null;
  enableCOD: boolean;
  enableBank: boolean;
  enableJazzcash: boolean;
  enableEasypaisa: boolean;
  minimumOrderAmount: number | null;
  policyText: string | null;
}

interface CompanyGroup {
  companyId: number;
  companyName: string;
  items: CartItem[];
  subtotal: number;
  paymentSettings: PaymentSettings | null;
  loadingSettings: boolean;
  selectedPayment: string;
  screenshot: File | null;
  screenshotPreview: string | null;
}

interface PartnerCheckoutProps {
  partner: {
    cityName?: string;
    state?: string;
    fullAddress?: string;
    country?: string;
  };
  onBack: () => void;
  onSuccess: () => void;
}

export default function PartnerCheckout({ partner, onBack, onSuccess }: PartnerCheckoutProps) {
  const { country } = useCountry();
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shippingData, setShippingData] = useState({
    city: partner.cityName || '',
    province: partner.state || '',
    address: partner.fullAddress || '',
    shippingAddress: partner.fullAddress || '',
  });

  useEffect(() => {
    fetchCartAndSettings();
  }, [country]);

  const getPrice = (item: CartItem) => item.variant.companyPrice || item.variant.customerPrice;

  const getDiscount = (item: CartItem) => {
    const discounts = item.product.discounts;
    const vd = discounts.find(d => d.variantId === item.variant.id);
    if (vd) return vd.percentage;
    const pd = discounts.find(d => d.productId === item.product.id && !d.variantId);
    if (pd) return pd.percentage;
    const cd = discounts.find(d => !d.productId && !d.variantId);
    if (cd) return cd.percentage;
    return 0;
  };

  const getFinalPrice = (item: CartItem) => {
    const price = getPrice(item);
    const discount = getDiscount(item);
    return discount > 0 ? Math.round((price - (price * discount / 100)) * 100) / 100 : price;
  };

  const fetchCartAndSettings = async () => {
    try {
      const res = await fetch(`/api/partner/cart?country=${encodeURIComponent(country)}`);
      const data = await res.json();
      if (!res.ok) return;

      const cartItems: CartItem[] = data.cartItems;

      // Group by company
      const groupMap = new Map<number, CompanyGroup>();
      cartItems.forEach(item => {
        const companyId = item.product.company?.id || 0;
        const companyName = item.product.company?.companyName || 'Unknown';
        if (!groupMap.has(companyId)) {
          groupMap.set(companyId, {
            companyId,
            companyName,
            items: [],
            subtotal: 0,
            paymentSettings: null,
            loadingSettings: true,
            selectedPayment: '',
            screenshot: null,
            screenshotPreview: null,
          });
        }
        const group = groupMap.get(companyId)!;
        group.items.push(item);
        group.subtotal += getFinalPrice(item) * item.quantity;
      });

      const groupsArray = Array.from(groupMap.values());
      setGroups(groupsArray);

      // Fetch payment settings for each company
      for (const group of groupsArray) {
        try {
          const settingsRes = await fetch(`/api/partner/shop/payment-settings?companyId=${group.companyId}`);
          const settingsData = await settingsRes.json();
          setGroups(prev => prev.map(g =>
            g.companyId === group.companyId
              ? { ...g, paymentSettings: settingsData.settings, loadingSettings: false }
              : g
          ));
        } catch {
          setGroups(prev => prev.map(g =>
            g.companyId === group.companyId
              ? { ...g, loadingSettings: false }
              : g
          ));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGroup = (companyId: number, updates: Partial<CompanyGroup>) => {
    setGroups(prev => prev.map(g => g.companyId === companyId ? { ...g, ...updates } : g));
  };

  const handleSubmit = async () => {
    // Validate shipping
    if (!shippingData.city || !shippingData.province || !shippingData.address) {
      toast.error('Please fill in all shipping fields');
      return;
    }

    // Validate payment methods selected
    for (const group of groups) {
      if (!group.selectedPayment) {
        toast.error(`Please select a payment method for ${group.companyName}`);
        return;
      }
      if (group.selectedPayment !== 'cod' && !group.screenshot) {
        toast.error(`Please upload payment screenshot for ${group.companyName}`);
        return;
      }
      if (group.paymentSettings?.minimumOrderAmount && group.subtotal < group.paymentSettings.minimumOrderAmount) {
        toast.error(`Minimum order for ${group.companyName} is ${formatPrice(group.paymentSettings.minimumOrderAmount, country, true)}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      const ordersData = groups.map((group, index) => {
        const screenshotKey = group.screenshot ? `screenshot_${index}` : undefined;
        if (group.screenshot && screenshotKey) {
          formData.append(screenshotKey, group.screenshot);
        }
        return {
          companyId: group.companyId,
          paymentMethod: group.selectedPayment,
          screenshotKey,
          ...shippingData,
          shippingAddress: shippingData.address,
        };
      });

      formData.append('orders', JSON.stringify(ordersData));

      const res = await fetch('/api/partner/checkout', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Orders placed successfully!');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to place orders');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  const grandTotal = groups.reduce((sum, g) => sum + g.subtotal, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-green-600">Checkout</h2>
      </div>

      {/* Shipping Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Shipping Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={shippingData.city}
              onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province/State *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={shippingData.province}
              onChange={(e) => setShippingData({ ...shippingData, province: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Address *</label>
            <textarea
              required
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={shippingData.address}
              onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Per-Company Payment */}
      {groups.map((group) => (
        <div key={group.companyId} className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{group.companyName}</h3>
              <span className="font-bold text-green-700">{formatPrice(group.subtotal, country, true)}</span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Items Summary */}
            <div className="space-y-2">
              {group.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product.productName} ({item.variant.packingVolume}) x{item.quantity}
                  </span>
                  <span className="font-medium">{formatPrice(getFinalPrice(item) * item.quantity, country, true)}</span>
                </div>
              ))}
            </div>

            {/* Payment Settings */}
            {group.loadingSettings ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading payment options...
              </div>
            ) : !group.paymentSettings ? (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Payment options not configured by this company. Checkout unavailable.</span>
              </div>
            ) : (
              <>
                {/* Policy Text */}
                {group.paymentSettings.policyText && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">{group.paymentSettings.policyText}</p>
                  </div>
                )}

                {/* Payment Method Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <div className="space-y-2">
                    {group.paymentSettings.enableCOD && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`payment-${group.companyId}`}
                          value="cod"
                          checked={group.selectedPayment === 'cod'}
                          onChange={() => updateGroup(group.companyId, { selectedPayment: 'cod', screenshot: null, screenshotPreview: null })}
                          className="text-green-600"
                        />
                        <span className="text-sm">Cash on Delivery</span>
                      </label>
                    )}
                    {group.paymentSettings.enableBank && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`payment-${group.companyId}`}
                          value="bank"
                          checked={group.selectedPayment === 'bank'}
                          onChange={() => updateGroup(group.companyId, { selectedPayment: 'bank' })}
                          className="text-green-600"
                        />
                        <span className="text-sm">
                          Bank Transfer - {group.paymentSettings.bankName} ({group.paymentSettings.accountTitle}: {group.paymentSettings.accountNumber})
                        </span>
                      </label>
                    )}
                    {group.paymentSettings.enableJazzcash && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`payment-${group.companyId}`}
                          value="jazzcash"
                          checked={group.selectedPayment === 'jazzcash'}
                          onChange={() => updateGroup(group.companyId, { selectedPayment: 'jazzcash' })}
                          className="text-green-600"
                        />
                        <span className="text-sm">JazzCash - {group.paymentSettings.jazzcashNumber}</span>
                      </label>
                    )}
                    {group.paymentSettings.enableEasypaisa && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`payment-${group.companyId}`}
                          value="easypaisa"
                          checked={group.selectedPayment === 'easypaisa'}
                          onChange={() => updateGroup(group.companyId, { selectedPayment: 'easypaisa' })}
                          className="text-green-600"
                        />
                        <span className="text-sm">Easypaisa - {group.paymentSettings.easypaisaNumber}</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Screenshot Upload (for non-COD) */}
                {group.selectedPayment && group.selectedPayment !== 'cod' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Screenshot * <span className="text-gray-400 font-normal">(Upload proof of payment)</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <Upload className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {group.screenshot ? group.screenshot.name : 'Choose File'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            updateGroup(group.companyId, {
                              screenshot: file,
                              screenshotPreview: file ? URL.createObjectURL(file) : null,
                            });
                          }}
                        />
                      </label>
                      {group.screenshotPreview && (
                        <div className="relative w-20 h-20">
                          <Image
                            src={group.screenshotPreview}
                            alt="Screenshot preview"
                            fill
                            className="object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {/* Grand Total & Submit */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Grand Total</span>
          <span className="text-xl font-bold text-green-700">{formatPrice(grandTotal, country, true)}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Back to Cart
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || groups.some(g => !g.paymentSettings)}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Placing Orders...</>
            ) : (
              'Place Orders'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
