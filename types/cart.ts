export interface ProductImage {
  url: string
  alt: string
}

export interface Product {
  id: number
  productName: string
 
  image: ProductImage | null
}

export interface ProductVariant {
  id: number
  packingVolume: string
  customerPrice: number
}

export interface CartItem {
  id: number
  quantity: number
  product: Product
  variant: ProductVariant  // Add this
}