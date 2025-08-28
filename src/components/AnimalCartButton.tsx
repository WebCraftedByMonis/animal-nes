'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { useCart } from '@/contexts/CartContext'

interface AddAnimalToCartButtonProps {
  animalId: number
}

export default function AddAnimalToCartButton({ animalId }: AddAnimalToCartButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { incrementAnimalCount } = useCart()
  const [loading, setLoading] = useState(false)

  const handleAddToCart = async () => {
    if (loading) return  // Prevent double clicks
    if (!session?.user) {
      toast.error('Please login to add items to your cart.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/animal-cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animalId }),
      })

      if (res.ok) {
        toast.success('Animal added to cart.')
        incrementAnimalCount() // Update cart count immediately
        router.refresh()
      } else {
        const err = await res.json()
        toast.error(err.message || 'Error adding to cart')
      }
    } catch (error) {
      console.error('Error adding animal to cart:', error)
      toast.error('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading}
      className={`w-full hover:cursor-pointer py-4 rounded-xl font-semibold text-lg shadow-md ${
        loading
          ? 'bg-green-700 cursor-not-allowed'
          : ' bg-green-500  text-white'
      }`}
    >
      {loading ? 'Adding to Cart...' : 'Add Animal to Cart'}
    </button>
  )
}
