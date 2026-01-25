'use client'

import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCart } from '@/contexts/CartContext'

interface ProductImage {
  url: string
  alt: string
}

interface Discount {
  id: number
  percentage: number
  startDate: string
  endDate: string
  isActive: boolean
  companyId: number | null
  productId: number | null
  variantId: number | null
}

interface Product {
  id: number
  productName: string
  image: ProductImage | null
  discounts?: Discount[]
}

interface ProductVariant {
  id: number
  packingVolume: string
  customerPrice: number
  discounts?: Discount[]
}

interface CartItem {
  id: number
  quantity: number
  product: Product
  variant: ProductVariant
}

interface CartClientProps {
  cartItems: CartItem[]
}

// Helper to get active discount for an item
// Priority: variant-level > product-level > company-level
function getActiveDiscount(item: CartItem): Discount | null {
  // Check variant-level discount first
  if (item.variant.discounts && item.variant.discounts.length > 0) {
    const variantDiscount = item.variant.discounts.find(d => d.isActive)
    if (variantDiscount) return variantDiscount
  }

  // Then check product-level discount
  if (item.product.discounts && item.product.discounts.length > 0) {
    const productDiscounts = item.product.discounts.filter(d =>
      d.isActive && d.productId !== null && d.variantId === null && !d.companyId
    )
    if (productDiscounts.length > 0) {
      return productDiscounts.reduce((a, b) => a.percentage > b.percentage ? a : b)
    }

    // Finally check company-level discount
    const companyDiscounts = item.product.discounts.filter(d =>
      d.isActive && d.companyId !== null && d.productId === null && d.variantId === null
    )
    if (companyDiscounts.length > 0) {
      return companyDiscounts.reduce((a, b) => a.percentage > b.percentage ? a : b)
    }
  }

  return null
}

// Calculate discounted price
function calculateDiscountedPrice(price: number, percentage: number): number {
  return Math.round((price - (price * percentage / 100)) * 100) / 100
}

// Get final price for cart item
function getFinalPrice(item: CartItem): number {
  const discount = getActiveDiscount(item)
  if (discount) {
    return calculateDiscountedPrice(item.variant.customerPrice, discount.percentage)
  }
  return item.variant.customerPrice
}

export default function CartClient({ cartItems }: CartClientProps) {
  const [cart, setCart] = useState<CartItem[]>(cartItems)
  const [isUpdating, setIsUpdating] = useState<number | null>(null)
  const { decrementProductCount } = useCart()

  const updateQuantity = async (id: number, newQuantity: string) => {
    // Parse the quantity and validate
    const quantity = parseInt(newQuantity)
    
    // If invalid or less than 1, don't update
    if (isNaN(quantity) || quantity < 1) {
      // Optionally, reset to previous value
      return
    }

    setIsUpdating(id)
    
    try {
      const res = await fetch('/api/cart/update', {
        method: 'POST',
        body: JSON.stringify({ id, quantity }),
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        setCart(prev =>
          prev.map(item => item.id === id ? { ...item, quantity } : item)
        )
      } else {
        console.error('Failed to update quantity')
        // Optionally show an error toast
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
    } finally {
      setIsUpdating(null)
    }
  }

  const removeItem = async (id: number) => {
    try {
      const res = await fetch('/api/cart/remove', {
        method: 'POST',
        body: JSON.stringify({ id }),
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        setCart(prev => prev.filter(item => item.id !== id))
        decrementProductCount() // Update cart count immediately
      }
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  const handleQuantityChange = (itemId: number, value: string) => {
    // Allow empty string temporarily while typing
    if (value === '') {
      // Update local state only (don't call API)
      setCart(prev =>
        prev.map(item => item.id === itemId ? { ...item, quantity: 0 } : item)
      )
      return
    }

    // Only allow digits
    if (!/^\d+$/.test(value)) {
      return
    }

    const numValue = parseInt(value)
    
    // Update local state immediately for better UX
    setCart(prev =>
      prev.map(item => item.id === itemId ? { ...item, quantity: numValue } : item)
    )

    // Debounce API call (optional but recommended)
    updateQuantity(itemId, value)
  }

  const handleQuantityBlur = (item: CartItem) => {
    // On blur, if quantity is 0 or invalid, reset to 1
    if (item.quantity === 0 || isNaN(item.quantity)) {
      setCart(prev =>
        prev.map(cartItem => cartItem.id === item.id ? { ...cartItem, quantity: 1 } : cartItem)
      )
      updateQuantity(item.id, '1')
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * getFinalPrice(item), 0)
  const originalSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.variant.customerPrice, 0)
  const totalSavings = originalSubtotal - subtotal

  if (!cart.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Add some products to get started!</p>
          <Link href="/products">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Shopping Cart</h1>
        <p className="text-gray-600 dark:text-gray-400">{cart.length} {cart.length === 1 ? 'item' : 'items'} in your cart</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white dark:bg-zinc-900 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <div className="relative w-32 h-32 sm:w-28 sm:h-28 mx-auto sm:mx-0 bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                    <Image
                      src={item.product.image?.url || '/placeholder.png'}
                      alt={item.product.image?.alt || item.product.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                      {item.product.productName}
                    </h2>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        {item.variant.packingVolume}
                      </span>
                      {getActiveDiscount(item) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                          {getActiveDiscount(item)?.percentage}% OFF
                        </span>
                      )}
                    </div>
                    {getActiveDiscount(item) ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            PKR {getFinalPrice(item).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 line-through">
                            PKR {item.variant.customerPrice.toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          You save PKR {(item.variant.customerPrice - getFinalPrice(item)).toLocaleString()} per item
                        </p>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        PKR {item.variant.customerPrice.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center justify-between mt-4 gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity:</label>
                      <div className="flex items-center border border-gray-300 dark:border-zinc-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => handleQuantityChange(item.id, String(Math.max(1, item.quantity - 1)))}
                          disabled={isUpdating === item.id || item.quantity <= 1}
                          className="px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity || ''}
                          className="w-16 px-2 py-2 text-center border-x border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          onBlur={() => handleQuantityBlur(item)}
                          disabled={isUpdating === item.id}
                        />
                        <button
                          onClick={() => handleQuantityChange(item.id, String(item.quantity + 1))}
                          disabled={isUpdating === item.id}
                          className="px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      {isUpdating === item.id && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Updating...</span>
                      )}
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary - Sticky on Desktop */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                <span className="font-medium">PKR {subtotal.toLocaleString()}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount Savings</span>
                  <span className="font-medium">- PKR {totalSavings.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Shipping</span>
                <span className="text-sm">Calculated at checkout</span>
              </div>
              <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    PKR {subtotal.toLocaleString()}
                  </span>
                </div>
                {totalSavings > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    You are saving PKR {totalSavings.toLocaleString()} with discounts!
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/checkout" className="block">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold">
                  Proceed to Checkout
                </Button>
              </Link>
              <Link href="/products" className="block">
                <Button variant="outline" className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 py-6 text-lg font-semibold">
                  Continue Shopping
                </Button>
              </Link>
            </div>

            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}