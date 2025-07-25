// components/AddToCartClientWrapper.tsx
'use client'

import AddToCartButton from './AddToCartButton'

interface Props {
  productId: number;
  isActive: boolean;
  variantId: number; 
}

export default function AddToCartClientWrapper ({ productId, isActive, variantId }: Props) {
  return <AddToCartButton  variantId={variantId} productId={productId} isActive={isActive}   />
}
