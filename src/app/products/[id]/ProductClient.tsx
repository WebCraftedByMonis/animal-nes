'use client';

import { useState } from 'react';
import Image from 'next/image';
import AddToCartClientWrapper from '@/components/AddToCartClientWrapper';

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
}

export default function ProductClient({ product }: { product: Product }) {
  const [selectedVariantId, setSelectedVariantId] = useState<number>(product.variants[0].id);



  

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Product Image Section */}
        <div className="md:w-1/2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {product.image ? (
              <Image
                src={product.image.url}
                alt={product.image.alt || product.productName}
                width={600}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />
            ) : (
              <div className="bg-gray-100 aspect-square flex items-center justify-center">
                <span className="text-gray-400">No Image Available</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Info Section */}
        <div className="md:w-1/2">
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex gap-2">
              {product.isFeatured && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Featured
                </span>
              )}
              {!product.isActive && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Out of Stock
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold ">{product.productName}</h1>

            {product.genericName && (
              <p >Generic: {product.genericName}</p>
            )}

          <div className="space-y-4">
  {product.variants.map((variant) => (
    <label
      key={variant.id}
      className="border rounded-md p-3 bg-gray-50 flex items-center cursor-pointer"
    >
      <input
        type="radio"
        name="variant"
        value={variant.id}
        checked={selectedVariantId === variant.id}
        onChange={() => setSelectedVariantId(variant.id)}
        className="mr-3"
      />
      <div>
        <p className="text-lg font-semibold text-gray-800">
          Packing: {variant.packingVolume}
        </p>
      </div>
    </label>
  ))}
</div>


{selectedVariantId && (
  <div className="mt-4 border rounded-md p-4 bg-green-50">
    {product.variants
      .filter((v) => v.id === selectedVariantId)
      .map((variant) => (
        <div key={variant.id}>
          <p className="text-green-700 font-bold text-xl">
            PKR {variant.customerPrice.toFixed(2)}
          </p>
          {/* {variant.dealerPrice && (
            <p className="text-sm text-gray-500 line-through">
              R: PKR {variant.dealerPrice.toFixed(2)}
            </p>
          )} */}
          {variant.companyPrice && (
            <p className="text-sm text-gray-500">
              Retail : PKR {variant.companyPrice.toFixed(2)}
            </p>
          )}
          <p className="text-sm text-gray-700">Inventory: {variant.inventory}</p>
        </div>
      ))}
  </div>
)}



            <div className="py-4 border-t border-b border-gray-200">
              <p >{product.description}</p>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-500">Category</p>
                <p>{product.category}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Sub Category</p>
                <p>{product.subCategory}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Product Type</p>
                <p>{product.productType}</p>
              </div>

            </div>

            {product.dosage && (
              <div className="bg-green-50 dark:bg-green-800 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 dark:text-white">Dosage Information</h3>
                <p className="text-green-700 dark:text-white mt-1">{product.dosage}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">

              {product.isActive && selectedVariantId && (
  <AddToCartClientWrapper productId={product.id} variantId={selectedVariantId} isActive={product.isActive} />
)}


            </div>

            {/* Company & Partner Info */}
            <div className="pt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-500">Manufacturer</p>
                <p>{product.company.companyName}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Supplier</p>
                <p>{product.partner.partnerName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Section */}
      {product.pdf && (
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Documents</h2>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-green-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>

            <div>
              <p className="font-medium">Product Information PDF</p>
              <a
                href={product.pdf.url}
                download={`${product.productName.replace(/\s+/g, '_')}_product_sheet.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1 mt-1"
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
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="font-medium text-gray-500">Category</p>
          <p className="mt-1 text-black ">{product.category}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="font-medium text-gray-500">Sub Category</p>
          <p className="mt-1 text-black ">{product.subCategory}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="font-medium text-gray-500">Sub-Sub Category</p>
          <p className="mt-1  text-black ">{product.subsubCategory}</p>
        </div>
      </div>
    </div>
  )
}