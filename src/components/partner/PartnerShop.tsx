'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Search, ShoppingCart, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import { formatPrice } from '@/lib/currency-utils';

interface ProductVariant {
  id: number;
  packingVolume: string;
  companyPrice: number | null;
  dealerPrice: number | null;
  customerPrice: number;
}

interface ShopProduct {
  id: number;
  productName: string;
  genericName: string | null;
  category: string | null;
  description: string | null;
  image?: { url: string; alt: string } | null;
  company?: { id: number; companyName: string } | null;
  variants: ProductVariant[];
  discounts: { percentage: number; variantId: number | null; productId: number | null }[];
}

interface PartnerShopProps {
  onCartUpdate?: () => void;
  cartCount: number;
  onViewCart: () => void;
  onCheckout: () => void;
}

export default function PartnerShop({ onCartUpdate, cartCount, onViewCart }: PartnerShopProps) {
  const { country } = useCountry();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [companies, setCompanies] = useState<{ id: number; companyName: string }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(category && { category }),
        ...(companyId && { companyId }),
        ...(country && { country }),
      });

      const res = await fetch(`/api/partner/shop/products?${params}`);
      const data = await res.json();

      if (res.ok) {
        setProducts(data.products);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        if (data.categories) setCategories(data.categories);
        if (data.companies) setCompanies(data.companies);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, companyId, country]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = () => {
    setPage(1);
    fetchProducts();
  };

  const addToCart = async (productId: number, variantId: number) => {
    const key = `${productId}-${variantId}`;
    setAddingToCart(key);
    try {
      const res = await fetch('/api/partner/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId }),
      });

      if (res.ok) {
        toast.success('Added to cart!');
        onCartUpdate?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setAddingToCart(null);
    }
  };

  const getCompanyPrice = (variant: ProductVariant) => {
    return variant.companyPrice || variant.customerPrice;
  };

  const getDiscountForVariant = (product: ShopProduct, variantId: number) => {
    // Check variant-level discount
    const variantDiscount = product.discounts.find(d => d.variantId === variantId);
    if (variantDiscount) return variantDiscount.percentage;

    // Check product-level discount
    const productDiscount = product.discounts.find(d => d.productId === product.id && !d.variantId);
    if (productDiscount) return productDiscount.percentage;

    // Check company-level discount
    const companyDiscount = product.discounts.find(d => !d.productId && !d.variantId);
    if (companyDiscount) return companyDiscount.percentage;

    return 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-green-600">Shop Products</h2>
        <button
          onClick={onViewCart}
          className="relative px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            value={companyId}
            onChange={(e) => { setCompanyId(e.target.value); setPage(1); }}
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Search
          </button>
          <button
            onClick={() => { setSearch(''); setCategory(''); setCompanyId(''); setPage(1); }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
        <p className="text-sm text-gray-500">{total} products found</p>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-green-500" />
          <span className="ml-2 text-gray-600">Loading products...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const cheapestVariant = product.variants.reduce((min, v) => {
              const price = getCompanyPrice(v);
              const minPrice = getCompanyPrice(min);
              return price < minPrice ? v : min;
            }, product.variants[0]);

            return (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Image */}
                <div className="relative w-full h-48 bg-gray-100">
                  {product.image?.url ? (
                    <Image
                      src={product.image.url}
                      alt={product.image.alt || product.productName}
                      fill
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.productName}</h3>
                  {product.company && (
                    <p className="text-xs text-blue-600">{product.company.companyName}</p>
                  )}
                  {product.category && (
                    <p className="text-xs text-gray-500">{product.category}</p>
                  )}

                  {/* Variants */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    {product.variants.map((variant) => {
                      const price = getCompanyPrice(variant);
                      const discount = getDiscountForVariant(product, variant.id);
                      const finalPrice = discount > 0 ? Math.round((price - (price * discount / 100)) * 100) / 100 : price;
                      const cartKey = `${product.id}-${variant.id}`;

                      return (
                        <div key={variant.id} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 truncate">{variant.packingVolume}</p>
                            <div className="flex items-center gap-1">
                              {discount > 0 && (
                                <span className="text-xs text-gray-400 line-through">{formatPrice(price, country, true)}</span>
                              )}
                              <span className="text-sm font-bold text-green-700">{formatPrice(finalPrice, country, true)}</span>
                              {discount > 0 && (
                                <span className="text-xs text-red-500 font-medium">-{discount}%</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => addToCart(product.id, variant.id)}
                            disabled={addingToCart === cartKey}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center gap-1 whitespace-nowrap"
                          >
                            {addingToCart === cartKey ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-3 h-3" />
                            )}
                            Add
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
