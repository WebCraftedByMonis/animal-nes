'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

interface AddToCartButtonProps {
  productId: number
  isActive: boolean
  variantId: number
}

export default function AddToCartButton({ productId, isActive, variantId }: AddToCartButtonProps) {
  const router = useRouter()
  const { addToCart } = useCart()

  const [loading, setLoading] = useState(false)

  const handleAddToCart = async () => {
    setLoading(true)

    try {
      await addToCart(productId, variantId)
      router.refresh()  // Optional: Refresh page to reflect cart state
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading || !isActive}
      className="flex items-center justify-center gap-2 flex-1 bg-white dark:bg-zinc-900 border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 py-3 px-6 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin w-5 h-5" />
          Adding...
        </>
      ) : (
        'Add to Cart'
      )}
    </button>
  )
}
