'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface AddAnimalToCartButtonProps {
  animalId: number
}

export default function AddAnimalToCartButton({ animalId }: AddAnimalToCartButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const handleAddToCart = async () => {
    if (!session?.user) {
      toast.error('Please login to add items to your cart.')
      return
    }

    try {
      const res = await fetch('/api/animal-cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animalId }),
      })

      if (res.ok) {
        toast.success('Animal added to cart.')
        router.refresh()
      } else {
        const err = await res.json()
        toast.error(err.message || 'Error adding to cart')
      }
    } catch (error) {
      console.error('Error adding animal to cart:', error)
      toast.error('Something went wrong.')
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      className="w-full hover:cursor-pointer bg-gradient-to-r from-green-500 to-green-700 text-white py-4 rounded-xl font-semibold text-lg shadow-md"
    >
      Add Animal to Cart
    </button>
  )
}
