'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { useCart } from '@/contexts/CartContext'
import OptimizedImage from '@/components/OptimizedImage'

interface AnimalImage {
  id: number
  url: string
  alt: string
}

interface Animal {
  id: number
  specie: string
  breed: string
  gender: string
  totalPrice: number
  
  images: AnimalImage[]
}

interface AnimalCartItem {
  id: number
  quantity: number
  animal: Animal
}

interface AnimalCartClientProps {
  cartItems: AnimalCartItem[]
}

export default function AnimalCartClient({ cartItems }: AnimalCartClientProps) {
  const [cart, setCart] = useState<AnimalCartItem[]>(cartItems)
  const { decrementAnimalCount } = useCart()

  const removeItem = async (id: number) => {
    const res = await fetch('/api/animal-cart/remove', {
      method: 'POST',
      body: JSON.stringify({ id }),
      headers: { 'Content-Type': 'application/json' },
    })

    if (res.ok) {
      setCart(prev => prev.filter(item => item.id !== id))
      decrementAnimalCount() // Update cart count immediately
      toast.success('Animal removed from cart')
    } else {
      toast.error('Failed to remove animal from cart')
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.animal.totalPrice  , 0)

  if (!cart.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your animal cart is empty</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Browse and add animals to get started!</p>
          <Link href="/animals">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg">
              Browse Animals
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
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Animal Cart</h1>
        <p className="text-gray-600 dark:text-gray-400">{cart.length} {cart.length === 1 ? 'animal' : 'animals'} in your cart</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white dark:bg-zinc-900 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6">
                {/* Animal Image */}
                <div className="flex-shrink-0">
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto sm:mx-0 bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                    <OptimizedImage
                      src={item.animal.images[0]?.url || '/placeholder.png'}
                      alt={item.animal.images[0]?.alt || item.animal.specie}
                      width={160}
                      height={160}
                      className="object-cover w-full h-full"
                      loading="lazy"
                      cloudinaryOptions={{
                        width: 200,
                        height: 200,
                        quality: 'auto',
                        format: 'auto',
                        crop: 'fill'
                      }}
                    />
                  </div>
                </div>

                {/* Animal Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {item.animal.specie}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {item.animal.breed}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                        {item.animal.gender}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                      PKR {item.animal.totalPrice.toLocaleString()}
                    </p>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Quantity: {item.quantity}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove from Cart
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
                <span>Subtotal ({cart.length} {cart.length === 1 ? 'animal' : 'animals'})</span>
                <span className="font-medium">PKR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Delivery</span>
                <span className="text-sm">Calculated at checkout</span>
              </div>
              <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    PKR {subtotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/checkout" className="block">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold">
                  Proceed to Checkout
                </Button>
              </Link>
              <Link href="/animals" className="block">
                <Button variant="outline" className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 py-6 text-lg font-semibold">
                  Browse More Animals
                </Button>
              </Link>
            </div>

            {/* Info Badge */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>All animals are verified and health-checked before delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
