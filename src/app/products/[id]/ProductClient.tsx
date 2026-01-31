'use client';

import { useState } from 'react';
import Image from 'next/image';
import AddToCartClientWrapper from '@/components/AddToCartClientWrapper';
import BuyNowButton from '@/components/BuyNowButton';
import WishlistButton from '@/components/WishlistButton';
import ProductReviewForm from '@/components/ProductReviewForm';
import ProductReviews from '@/components/ProductReviews';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

interface Product {
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
  company: { companyName: string };
  partner: { partnerName: string };
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

export default function ProductClient({ product }: { product: Product }) {
  const [selectedVariantId, setSelectedVariantId] = useState<number>(product.variants[0]?.id || 0);
  const [showDescription, setShowDescription] = useState(false);
  const [showDosage, setShowDosage] = useState(false);
  const [refreshReviews, setRefreshReviews] = useState(0);

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
  const isOutOfStock = product.outofstock || !product.isActive;

  // Helper to get active discount for a variant
  const getActiveDiscount = (variantId: number): Discount | null => {
    if (!product.discounts || product.discounts.length === 0) return null;

    const now = new Date();
    const activeDiscounts = product.discounts.filter(d => {
      if (!d.isActive) return false;
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      return now >= start && now <= end;
    });

    if (activeDiscounts.length === 0) return null;

    // Prioritize variant-specific discount
    const variantDiscount = activeDiscounts.find(d => d.variantId === variantId);
    if (variantDiscount) return variantDiscount;

    // Return product-level discount (highest percentage)
    const productDiscounts = activeDiscounts.filter(d => d.productId !== null && d.variantId === null);
    if (productDiscounts.length > 0) {
      return productDiscounts.reduce((a, b) => a.percentage > b.percentage ? a : b);
    }

    return activeDiscounts[0];
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (price: number, percentage: number): number => {
    return Math.round((price - (price * percentage / 100)) * 100) / 100;
  };

  // Format time remaining for discount
  const formatTimeRemaining = (endDate: string): string => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m left`;
  };

  const activeDiscount = selectedVariant ? getActiveDiscount(selectedVariant.id) : null;
  const originalPrice = selectedVariant?.customerPrice || 0;
  const discountedPrice = activeDiscount ? calculateDiscountedPrice(originalPrice, activeDiscount.percentage) : originalPrice;
  const isEndingSoon = activeDiscount && (new Date(activeDiscount.endDate).getTime() - new Date().getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Product Image Section */}
        <div className="md:w-1/2">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md overflow-hidden relative">
            {product.image ? (
              <>
                <Image
                  src={product.image.url}
                  alt={product.image.alt || product.productName}
                  width={600}
                  height={600}
                  className="w-full h-auto object-contain"
                  priority
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

        {/* Product Info Section */}
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
              {isOutOfStock && (
                <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium px-2.5 py-0.5 rounded">
                  Out of Stock
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{product.productName}</h1>

            {product.genericName && (
              <p className="text-gray-600 dark:text-gray-400">Generic: {product.genericName}</p>
            )}

            {/* Price Display */}
            {selectedVariant && (
              <div className="space-y-2">
                {activeDiscount ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        PKR {discountedPrice.toLocaleString()}
                      </p>
                      <p className="text-xl text-gray-500 dark:text-gray-400 line-through">
                        PKR {originalPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        You save PKR {(originalPrice - discountedPrice).toLocaleString()}
                      </span>
                      {isEndingSoon && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
                          {formatTimeRemaining(activeDiscount.endDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    PKR {selectedVariant.customerPrice.toLocaleString()}
                  </p>
                )}
              </div>
            )}


            {/* Variant Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Select Variant</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`
                      px-4 py-2 rounded-lg transition-all text-sm font-medium
                      ${selectedVariantId === variant.id
                        ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-zinc-600'
                      }
                    `}
                  >
                    {variant.packingVolume}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Accordion */}
            {product.description && (
              <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowDescription(!showDescription)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">Description</span>
                  {showDescription ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
                {showDescription && (
                  <div className="px-4 pb-3">
                    <p className="text-gray-700 dark:text-gray-300">{product.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Dosage Accordion */}
            {product.dosage && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowDosage(!showDosage)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <span className="font-medium text-green-800 dark:text-green-200">Dosage/Use Information</span>
                  {showDosage ? (
                    <ChevronUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </button>
                {showDosage && (
                  <div className="px-4 pb-3">
                    <p className="text-green-700 dark:text-green-300">{product.dosage}</p>
                  </div>
                )}
              </div>
            )}

            {/* Product Details */}
            <div className="grid grid-cols-2 gap-4 text-sm pt-4">
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Category</p>
                <p className="text-gray-900 dark:text-gray-100">{product.category}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Sub Category</p>
                <p className="text-gray-900 dark:text-gray-100">{product.subCategory}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Product Type</p>
                <p className="text-gray-900 dark:text-gray-100">{product.productType}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Sub-Sub Category</p>
                <p className="text-gray-900 dark:text-gray-100">{product.subsubCategory}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
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

            

            {/* Company & Partner Info */}
            <div className="pt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Manufacturer</p>
                <p className="text-gray-900 dark:text-gray-100">{product.company.companyName}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Supplier</p>
                <p className="text-gray-900 dark:text-gray-100">{product.partner.partnerName}</p>
              </div>
            </div>
{/* Product Link */}
{product.productLink && (
  <div className="pt-4">
    <a
      href={product.productLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      <span className="font-medium">View External Info</span>
    </a>
  </div>
)}
            
          </div>
        </div>
      </div>
      

      

      {/* PDF Section */}
      {product.pdf && (
        <div className="mt-12 bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Product Documents</h2>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Product Information PDF</p>
              <a
                href={product.pdf.url}
                download={`${product.productName.replace(/\s+/g, '_')}_product_sheet.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm flex items-center gap-1 mt-1"
              >
                <span>Download PDF</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Product Categories */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm">
          <p className="font-medium text-gray-500 dark:text-gray-400">Category</p>
          <p className="mt-1 text-gray-900 dark:text-gray-100">{product.category}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm">
          <p className="font-medium text-gray-500 dark:text-gray-400">Sub Category</p>
          <p className="mt-1 text-gray-900 dark:text-gray-100">{product.subCategory}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm">
          <p className="font-medium text-gray-500 dark:text-gray-400">Sub-Sub Category</p>
          <p className="mt-1 text-gray-900 dark:text-gray-100">{product.subsubCategory}</p>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12 space-y-8">
        <ProductReviews productId={product.id} refreshTrigger={refreshReviews} />
        <ProductReviewForm
          productId={product.id}
          onReviewSubmitted={() => setRefreshReviews(prev => prev + 1)}
        />
      </div>
    </div>
  )
}