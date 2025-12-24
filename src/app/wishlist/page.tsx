import { Suspense } from 'react'
import WishlistClient from './WishlistClient'

export const metadata = {
  title: 'My Wishlist',
  description: 'View and manage your wishlist items',
}

export default function WishlistPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Loading...</div>}>
        <WishlistClient />
      </Suspense>
    </div>
  )
}
