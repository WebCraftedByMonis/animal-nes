import { Metadata } from 'next'
import BuyClient from './BuyClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 300 // 5 minutes - animals data changes frequently

export const metadata: Metadata = {
  title: 'Buy Animals',
  description: 'Browse and purchase animals from verified sellers',
  keywords: ['buy animals', 'animal marketplace', 'livestock purchase', 'animal sales'],
}

interface SellAnimalRequest {
  id: number;
  specie: string;
  breed: string;
  totalPrice: number;
  images: { url: string; alt: string }[];
}

async function getInitialAnimals(): Promise<{
  animals: SellAnimalRequest[]
  total: number
}> {
  try {
    const response = await fetch(`${getApiUrl()}/api/sell-animal?limit=8&page=1&sort=createdAt&order=desc`, {
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      console.error('Failed to fetch animals:', response.status)
      return { animals: [], total: 0 }
    }

    const data = await response.json()

    const simplified = data.items.map((item: any) => ({
      id: item.id,
      specie: item.specie,
      breed: item.breed,
      totalPrice: item.totalPrice,
      images: item.images,
    }))

    return {
      animals: simplified,
      total: data.total
    }
  } catch (error) {
    console.error('Error fetching initial animals:', error)
    return { animals: [], total: 0 }
  }
}

export default async function BuyPage() {
  const { animals, total } = await getInitialAnimals()
  
  return <BuyClient initialAnimals={animals} initialTotal={total} />
}
