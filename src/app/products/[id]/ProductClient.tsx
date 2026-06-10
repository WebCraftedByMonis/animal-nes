'use client';

import { useState } from 'react';
import Image from 'next/image';
import AddToCartClientWrapper from '@/components/AddToCartClientWrapper';
import BuyNowButton from '@/components/BuyNowButton';
import WishlistButton from '@/components/WishlistButton';
import { useCountry, Country } from '@/contexts/CountryContext';

interface Discount {
  id: number;
  name: string;
  percentage: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productId: number | null;
  variantId: number | null;
}

export interface ProductData {
  id: number;
  productName: string;
  genericName: string | null;
  category: string;
  subCategory: string;
  subsubCategory: string;
  productType: string;
  description: string | null;
  dosage: string | null;
  isFeatured: boolean;
  isActive: boolean;
  outofstock: boolean;
  productLink: string | null;
  image: { url: string; alt: string } | null;
  pdf: { url: string } | null;
  company: { companyName: string; country?: string | null };
  partner: { partnerName: string; country?: string | null };
  variants: {
    id: number;
    packingVolume: string;
    customerPrice: number;
    dealerPrice: number | null;
    companyPrice: number | null;
    inventory: number;
  }[];
  discounts?: Discount[];
}

function resolveProductCountry(
  company?: { country?: string | null } | null,
  partner?: { country?: string | null } | null,
): Country | null {
  const raw = (company?.country || partner?.country || '').trim().toLowerCase();
  if (!raw) return null;
  if (['uae', 'ae', 'dubai', 'united arab emirates'].includes(raw)) return 'UAE';
  if (['pakistan', 'pk'].includes(raw)) return 'Pakistan';
  return null;
}

export default function ProductClient({ product }: { product: ProductData }) {
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    product.variants[0]?.id || 0
  );
  const { country, setCountry, currencySymbol } = useCountry();

  const productCountry = resolveProductCountry(product.company, product.partner);

  if (productCountry && productCountry !== country) {
    return (
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md overflow-hidden relative">
            {product.image ? (
              <Image
                src={product.image.url.replace(/^http:\/\//, 'https://')}
                alt={product.image.alt || product.productName}
                width={600}
                height={600}
                className="w-full h-auto object-contain opacity-40"
                priority
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-gray-100 dark:bg-zinc-800 aspect-square flex items-center justify-center">
                <span className="text-gray-400 dark:text-gray-600">No Image Available</span>
              </div>
            )}
          </div>
        </div>
        <div className="md:w-1/2 flex items-center justify-center">
          <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl max-w-sm">
            <div className="text-4xl mb-4">{productCountry === 'UAE' ? '🇦🇪' : '🇵🇰'}</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Not available in {country}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              This product is only available for {productCountry}. Switch your country to view pricing and place an order.
            </p>
            <button
              onClick={() => setCountry(productCountry)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Switch to {productCountry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const isOutOfStock = product.outofstock || !product.isActive;

  const getActiveDiscount = (variantId: number): Discount | null => {
    if (!product.discounts?.length) return null;
    const now = new Date();
    const active = product.discounts.filter(
      (d) => d.isActive && now >= new Date(d.startDate) && now <= new Date(d.endDate)
    );
    if (!active.length) return null;
    const variantDiscount = active.find((d) => d.variantId === variantId);
    if (variantDiscount) return variantDiscount;
    const productLevel = active.filter((d) => d.productId !== null && d.variantId === null);
    if (productLevel.length) return productLevel.reduce((a, b) => (a.percentage > b.percentage ? a : b));
    return active[0];
  };

  const calcDiscounted = (price: number, pct: number) =>
    Math.round((price - (price * pct) / 100) * 100) / 100;

  const formatTimeLeft = (endDate: string): string => {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return `${Math.floor((diff % 3600000) / 60000)}m left`;
  };

  const activeDiscount = selectedVariant ? getActiveDiscount(selectedVariant.id) : null;
  const originalPrice = selectedVariant?.customerPrice || 0;
  const discountedPrice = activeDiscount
    ? calcDiscounted(originalPrice, activeDiscount.percentage)
    : originalPrice;
  const isEndingSoon =
    activeDiscount &&
    new Date(activeDiscount.endDate).getTime() - Date.now() < 86400000;

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* ── Product Image ─────────────────────────────────────────── */}
      <div className="md:w-1/2">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md overflow-hidden relative">
          {product.image ? (
            <>
              <Image
                src={product.image.url.replace(/^http:\/\//, 'https://')}
                alt={product.image.alt || product.productName}
                width={600}
                height={600}
                className="w-full h-auto object-contain"
                priority
                referrerPolicy="no-referrer"
              />
              <WishlistButton productId={product.id} />
            </>
          ) : (
            <div className="bg-gray-100 dark:bg-zinc-800 aspect-square flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-600">No Image Available</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Purchase Info ─────────────────────────────────────────── */}
      <div className="md:w-1/2">
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {activeDiscount && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded">
                {activeDiscount.percentage}% OFF
              </span>
            )}
            {product.isFeatured && (
              <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-0.5 rounded">
                Featured
              </span>
            )}
          </div>

          {product.genericName && (
            <p className="text-gray-600 dark:text-gray-400">
              Generic: {product.genericName}
            </p>
          )}

          {/* Price */}
          {selectedVariant && (
            <div className="space-y-2">
              {activeDiscount ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {currencySymbol} {discountedPrice.toLocaleString()}
                    </p>
                    <p className="text-xl text-gray-500 dark:text-gray-400 line-through">
                      {currencySymbol} {originalPrice.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      You save {currencySymbol}{' '}
                      {(originalPrice - discountedPrice).toLocaleString()}
                    </span>
                    {isEndingSoon && (
                      <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
                        {formatTimeLeft(activeDiscount.endDate)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {currencySymbol} {(selectedVariant.customerPrice ?? 0).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Variant Selection */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Select Variant
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    selectedVariantId === variant.id
                      ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-zinc-600'
                  }`}
                >
                  {variant.packingVolume}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            {!isOutOfStock && selectedVariantId && selectedVariant ? (
              <>
                <AddToCartClientWrapper
                  productId={product.id}
                  variantId={selectedVariantId}
                  isActive={product.isActive && !product.outofstock}
                />
                <BuyNowButton
                  productId={product.id}
                  variantId={selectedVariantId}
                  isActive={product.isActive && !product.outofstock}
                />
              </>
            ) : (
              <button
                disabled
                className="flex-1 bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
              >
                Out of Stock
              </button>
            )}
          </div>

          {/* Manufacturer & Supplier */}
          <div className="pt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-500 dark:text-gray-400">Manufacturer</p>
              <p className="text-gray-900 dark:text-gray-100">
                {product.company.companyName}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-500 dark:text-gray-400">Supplier</p>
              <p className="text-gray-900 dark:text-gray-100">
                {product.partner.partnerName}
              </p>
            </div>
          </div>

          {/* External Product Link */}
          {product.productLink && (
            <div className="pt-2">
              <a
                href={product.productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span className="font-medium">View External Info</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
