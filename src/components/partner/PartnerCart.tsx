'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Loader2, Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
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

interface GroupedCart {
  companyId: number;
  companyName: string;
  items: CartItem[];
  subtotal: number;
}

interface PartnerCartProps {
  onBack: () => void;
  onCheckout: () => void;
  onCartUpdate?: () => void;
}

export default function PartnerCart({ onBack, onCheckout, onCartUpdate }: PartnerCartProps) {
  const { country } = useCountry();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCart();
  }, [country]);

  const fetchCart = async () => {
    try {
      const res = await fetch(`/api/partner/cart?country=${encodeURIComponent(country)}`);
      const data = await res.json();
      if (res.ok) {
        setCartItems(data.cartItems);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (item: CartItem) => {
    return item.variant.companyPrice || item.variant.customerPrice;
  };

  const getDiscount = (item: CartItem) => {
    const discounts = item.product.discounts;
    const variantDiscount = discounts.find(d => d.variantId === item.variant.id);
    if (variantDiscount) return variantDiscount.percentage;
    const productDiscount = discounts.find(d => d.productId === item.product.id && !d.variantId);
    if (productDiscount) return productDiscount.percentage;
    const companyDiscount = discounts.find(d => !d.productId && !d.variantId);
    if (companyDiscount) return companyDiscount.percentage;
    return 0;
  };

  const getFinalPrice = (item: CartItem) => {
    const price = getPrice(item);
    const discount = getDiscount(item);
    return discount > 0 ? Math.round((price - (price * discount / 100)) * 100) / 100 : price;
  };

  const updateQuantity = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdatingId(cartItemId);
    try {
      const res = await fetch('/api/partner/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, quantity: newQuantity }),
      });
      if (res.ok) {
        setCartItems(prev => prev.map(item =>
          item.id === cartItemId ? { ...item, quantity: newQuantity } : item
        ));
        onCartUpdate?.();
      }
    } catch (error) {
      toast.error('Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (cartItemId: number) => {
    setUpdatingId(cartItemId);
    try {
      const res = await fetch('/api/partner/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId }),
      });
      if (res.ok) {
        setCartItems(prev => prev.filter(item => item.id !== cartItemId));
        toast.success('Removed from cart');
        onCartUpdate?.();
      }
    } catch (error) {
      toast.error('Failed to remove item');
    } finally {
      setUpdatingId(null);
    }
  };

  // Group by company
  const groupedCart: GroupedCart[] = [];
  cartItems.forEach(item => {
    const companyId = item.product.company?.id || 0;
    const companyName = item.product.company?.companyName || 'Unknown Company';
    let group = groupedCart.find(g => g.companyId === companyId);
    if (!group) {
      group = { companyId, companyName, items: [], subtotal: 0 };
      groupedCart.push(group);
    }
    group.items.push(item);
    group.subtotal += getFinalPrice(item) * item.quantity;
  });

  const grandTotal = groupedCart.reduce((sum, g) => sum + g.subtotal, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-green-600">Shopping Cart</h2>
        </div>
        <span className="text-sm text-gray-500">{cartItems.length} item(s)</span>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-lg">Your cart is empty</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          {groupedCart.map((group) => (
            <div key={group.companyId} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                <h3 className="font-semibold text-gray-900">{group.companyName}</h3>
              </div>

              <div className="divide-y divide-gray-100">
                {group.items.map((item) => {
                  const price = getPrice(item);
                  const discount = getDiscount(item);
                  const finalPrice = getFinalPrice(item);
                  const isUpdating = updatingId === item.id;

                  return (
                    <div key={item.id} className="p-4 flex items-center gap-4">
                      <div className="relative w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                        {item.product.image?.url ? (
                          <Image
                            src={item.product.image.url}
                            alt={item.product.image.alt || ''}
                            fill
                            className="object-contain p-1 rounded"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">N/A</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.product.productName}</p>
                        <p className="text-xs text-gray-500">{item.variant.packingVolume}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {discount > 0 && (
                            <span className="text-xs text-gray-400 line-through">{formatPrice(price, country, true)}</span>
                          )}
                          <span className="text-sm font-bold text-green-700">{formatPrice(finalPrice, country, true)}</span>
                          {discount > 0 && (
                            <span className="text-xs text-red-500">-{discount}%</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={isUpdating || item.quantity <= 1}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isUpdating}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <p className="font-bold text-green-700">{formatPrice(finalPrice * item.quantity, country, true)}</p>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={isUpdating}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center">
                <span className="text-sm text-gray-600">Subtotal ({group.companyName})</span>
                <span className="font-bold text-green-700">{formatPrice(group.subtotal, country, true)}</span>
              </div>
            </div>
          ))}

          {/* Grand Total & Checkout */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Grand Total</span>
              <span className="text-xl font-bold text-green-700">{formatPrice(grandTotal, country, true)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={onBack} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Continue Shopping
              </button>
              <button
                onClick={onCheckout}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
