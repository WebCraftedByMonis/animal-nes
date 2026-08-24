'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Megaphone, Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';

interface SponsorshipSettings {
  pricePerDay: number;
  pricePerDayAED: number;
  minDays: number;
  maxDays: number;
  paymentInstructions: string | null;
  jazzcashNumber: string | null;
  easypaisaNumber: string | null;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
}

interface ProductOption {
  id: number;
  productName: string;
}

interface SponsorProductFormProps {
  /** e.g. '/api/partner/products' or '/api/company/products' — the vendor's
   *  own paginated+searchable product listing endpoint. Queried live here
   *  instead of taking a static list, since a vendor's full product list can
   *  span many pages and a plain <select> (or a list capped to whatever page
   *  happens to be loaded elsewhere on the page) can't surface all of it. */
  productsEndpoint: string;
  submitEndpoint: string;
  isUAE?: boolean;
  onSuccess: () => void;
}

export default function SponsorProductForm({ productsEndpoint, submitEndpoint, isUAE, onSuccess }: SponsorProductFormProps) {
  const [settings, setSettings] = useState<SponsorshipSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [productId, setProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/sponsorship-settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data.settings);
        setDurationDays(data.settings.minDays);
      })
      .catch(() => toast.error('Failed to load sponsorship pricing'))
      .finally(() => setLoadingSettings(false));
  }, []);

  const fetchProductOptions = useCallback(async (search: string) => {
    setProductSearchLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${productsEndpoint}?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setProductOptions((data.products || []).map((p: ProductOption) => ({ id: p.id, productName: p.productName })));
      }
    } catch {
      setProductOptions([]);
    } finally {
      setProductSearchLoading(false);
    }
  }, [productsEndpoint]);

  // Load an initial batch of products as soon as the picker opens for the
  // first time, so there's something to see before the vendor types.
  useEffect(() => {
    if (productSearchOpen && productOptions.length === 0 && !productSearchLoading) {
      fetchProductOptions('');
    }
  }, [productSearchOpen, productOptions.length, productSearchLoading, fetchProductOptions]);

  const handleProductSearchChange = (value: string) => {
    setProductSearchTerm(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchProductOptions(value), 300);
  };

  const rate = settings ? (isUAE ? settings.pricePerDayAED : settings.pricePerDay) : 0;
  const amount = rate * durationDays;
  const currency = isUAE ? 'AED' : 'PKR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error('Select a product to sponsor');
      return;
    }
    if (!screenshot) {
      toast.error('Upload your payment screenshot');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('durationDays', String(durationDays));
      formData.append('paymentMethod', paymentMethod);
      formData.append('paymentScreenshot', screenshot);

      const response = await fetch(submitEndpoint, { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok) {
        toast.success('Sponsorship request submitted — pending admin review.');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to submit sponsorship request');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin inline-block text-amber-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-2">
      <div className="flex items-center gap-2 text-amber-700">
        <Megaphone className="w-5 h-5" />
        <h2 className="text-lg font-bold">Boost a Product</h2>
      </div>
      <p className="text-sm text-gray-600">
        Sponsored products appear in a labeled &quot;Featured by Our Vendors&quot; rail on the homepage and rank higher
        across the site while active. An admin verifies your payment before it goes live.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
        <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={productSearchOpen}
              className="w-full justify-between font-normal"
            >
              <span className={selectedProduct ? '' : 'text-muted-foreground'}>
                {selectedProduct ? selectedProduct.productName : 'Search your products…'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Type a product name…"
                value={productSearchTerm}
                onValueChange={handleProductSearchChange}
              />
              {productSearchLoading && (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
                </div>
              )}
              {!productSearchLoading && productOptions.length === 0 && (
                <CommandEmpty>No products found.</CommandEmpty>
              )}
              {!productSearchLoading && productOptions.length > 0 && (
                <CommandGroup className="max-h-60 overflow-y-auto">
                  {productOptions.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={String(p.id)}
                      onSelect={() => {
                        setProductId(String(p.id));
                        setSelectedProduct(p);
                        setProductSearchOpen(false);
                      }}
                    >
                      {p.productName}
                      {String(p.id) === productId && <Check className="ml-auto h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duration ({settings?.minDays}–{settings?.maxDays} days)
        </label>
        <input
          type="number"
          min={settings?.minDays}
          max={settings?.maxDays}
          value={durationDays}
          onChange={(e) => setDurationDays(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">Total: {currency} {amount.toLocaleString()}</span>
          {' '}({currency} {rate.toLocaleString()}/day × {durationDays} days)
        </p>
      </div>

      {(settings?.paymentInstructions || settings?.bankName || settings?.jazzcashNumber || settings?.easypaisaNumber) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
          <p className="font-semibold text-blue-900">Payment Details</p>
          {settings.paymentInstructions && <p className="text-blue-800">{settings.paymentInstructions}</p>}
          {settings.jazzcashNumber && <p className="text-blue-800">JazzCash: {settings.jazzcashNumber}</p>}
          {settings.easypaisaNumber && <p className="text-blue-800">Easypaisa: {settings.easypaisaNumber}</p>}
          {settings.bankName && (
            <p className="text-blue-800">
              {settings.bankName} — {settings.accountTitle} — {settings.accountNumber}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="bank_transfer">Bank Transfer</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">Easypaisa</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Screenshot</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setScreenshot(file);
            if (file) setScreenshotPreview(URL.createObjectURL(file));
          }}
          className="w-full text-sm"
          required
        />
        {screenshotPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={screenshotPreview} alt="Payment screenshot preview" className="mt-2 max-h-40 rounded-lg border" />
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting...' : `Submit Sponsorship Request`}
      </button>
    </form>
  );
}
