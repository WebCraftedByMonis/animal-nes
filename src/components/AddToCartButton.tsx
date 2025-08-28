'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'  // <-- Spinner Icon (Lucide)
import { useCart } from '@/contexts/CartContext'

interface AddToCartButtonProps {
  productId: number
  isActive: boolean
  variantId: number
}

export default function AddToCartButton({ productId, isActive, variantId }: AddToCartButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { incrementProductCount } = useCart()

  const [loading, setLoading] = useState(false)

  const handleAddToCart = async () => {
    if (!session?.user) {
      toast.error('Please login to add items to your cart.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId }),
      })

      if (res.ok) {
        toast.success('Product added to cart.')
        incrementProductCount() // Update cart count immediately
        router.refresh()  // Optional: Refresh page to reflect cart state
      } else {
        const err = await res.json()
        toast.error(err.message || 'Error adding to cart')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading || !isActive}
      className="flex items-center justify-center gap-2 flex-1 bg-green-500 border border-green-500 text-white hover:bg-green-600 py-3 px-6 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
