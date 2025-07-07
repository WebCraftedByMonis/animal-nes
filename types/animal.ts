export interface AnimalImage {
    id: number
    url: string
    alt: string
  }
  
  export interface Animal {
    id: number
    specie: string
    breed: string
    totalPrice: number
    images: AnimalImage[]
  }
  
  export interface AnimalCartItem {
    id: number
    quantity: number
    animal: Animal
  }
  