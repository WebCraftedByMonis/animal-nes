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
      <div className="text-center h-96 mt-10">
        <p className="text-lg font-medium">Your animal cart is empty.</p>
        <Link href="/animals">
          <Button className="mt-4 bg-green-500 hover:bg-green-600 text-white">
            Browse Animals
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-green-600 mb-6">Your Animal Cart</h1>

      <ul className="space-y-6">
        {cart.map(item => (
          <li key={item.id} className="flex flex-col sm:flex-row items-center bg-white shadow rounded-xl p-4 gap-4">
            <OptimizedImage
              src={item.animal.images[0]?.url || '/placeholder.png'}
              alt={item.animal.images[0]?.alt || item.animal.specie}
              width={100}
              height={100}
              className="rounded-md object-cover"
              loading="lazy"
              cloudinaryOptions={{
                width: 150,
                height: 150,
                quality: 'auto',
                format: 'auto',
                crop: 'fill'
              }}
            />

            <div className="flex-1 w-full">
              <h2 className="text-lg font-semibold">{item.animal.specie} - {item.animal.breed}</h2>
              <p className="text-sm text-gray-600">PKR {item.animal.totalPrice  }</p>

              <div className="mt-4">
                <Button
                  variant="ghost"
                  className="text-red-500 p-0 hover:underline text-sm h-auto"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row justify-between items-center">
        <div className="text-xl font-semibold">
          Subtotal: <span className="text-green-600">PKR {subtotal}</span>
        </div>

        <div className="mt-4 sm:mt-0 flex gap-4">
          <Link href="/animals">
            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-100">
              Browse More
            </Button>
          </Link>
          <Link href="/checkout">
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              Checkout
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
