// components/AddToCartClientWrapper.tsx
'use client'

import AddToCartButton from './AddToCartButton'

interface Props {
  productId: number
  isActive: boolean
}

export default function AddToCartClientWrapper({ productId, isActive }: Props) {
  return <AddToCartButton productId={productId} isActive={isActive} />
}
