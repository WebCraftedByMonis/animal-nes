'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

interface BuyNowButtonProps {
  productId: number
  isActive: boolean
  variantId: number
}

export default function BuyNowButton({ productId, isActive, variantId }: BuyNowButtonProps) {
  const router = useRouter()
  const { addToCart } = useCart()

  const [loading, setLoading] = useState(false)

  const handleBuyNow = async () => {
    setLoading(true)

    try {
      // Add to cart
      await addToCart(productId, variantId)

      // Redirect to checkout immediately
      router.push('/checkout')
    } catch (error) {
      console.error('Error during buy now:', error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleBuyNow}
      disabled={loading || !isActive}
      className="flex items-center justify-center gap-2 flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin w-5 h-5" />
          Processing...
        </>
      ) : (
        <>
          <Zap className="w-5 h-5" />
          Buy Now
        </>
      )}
    </button>
  )
}
