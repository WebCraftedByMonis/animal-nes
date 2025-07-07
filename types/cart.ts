export interface ProductImage {
    url: string
    alt: string
  }
  
  export interface Product {
    id: number
    productName: string
    customerPrice: number
    image: ProductImage | null
  }
  
  export interface CartItem {
    id: number
    quantity: number
    product: Product
    
  }
  