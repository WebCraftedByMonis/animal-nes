'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useLoginModal } from '@/contexts/LoginModalContext'
import AnimalCartClient from '@/components/AnimalCartClient'

export default function AnimalCartPage() {
  const { data: session, status } = useSession()
  const { openModal } = useLoginModal()
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [hasPromptedLogin, setHasPromptedLogin] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated' && !hasPromptedLogin) {
      setHasPromptedLogin(true)
      openModal('cart')
      setLoading(false)
      return
    }

    if (status === 'authenticated' && session?.user?.email) {
      fetch('/api/animal-cart')
        .then(res => res.json())
        .then(data => {
          setCartItems(data.cart || [])
          setLoading(false)
        })
        .catch(error => {
          console.error('Error fetching animal cart:', error)
          setLoading(false)
        })
    }
  }, [status, session, openModal, hasPromptedLogin])

  if (loading) {
    return <div className="text-center mt-10">Loading cart...</div>
  }

  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-8 border border-green-200 dark:border-green-800">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Your Animal Cart
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to view your saved animals and complete your purchase.
          </p>
          <button
            onClick={() => openModal('cart')}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Sign In to View Cart
          </button>
        </div>
      </div>
    )
  }

  return <AnimalCartClient cartItems={cartItems} />
}
