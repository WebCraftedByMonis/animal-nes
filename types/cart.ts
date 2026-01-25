export interface ProductImage {
  url: string
  alt: string
}

export interface Discount {
  id: number
  percentage: number
  startDate: string
  endDate: string
  isActive: boolean
  companyId: number | null
  productId: number | null
  variantId: number | null
}

export interface Product {
  id: number
  productName: string
  image: ProductImage | null
  discounts?: Discount[]
}

export interface ProductVariant {
  id: number
  packingVolume: string
  customerPrice: number
  discounts?: Discount[]
}

export interface CartItem {
  id: number
  quantity: number
  product: Product
  variant: ProductVariant
}