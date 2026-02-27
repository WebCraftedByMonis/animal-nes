import { Metadata } from 'next'
import BuyClient from './BuyClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 300 // 5 minutes - animals data changes frequently

export const metadata: Metadata = {
  title: 'Buy Animals | Animal Wellness',
  description: 'Browse and buy verified animals online — cows, buffaloes, goats, sheep, camels, poultry, horses and more. Health-certified livestock from trusted sellers across Pakistan and UAE.',
  keywords: [
    'buy animals online', 'livestock for sale', 'buy cow Pakistan', 'buy buffalo',
    'buy goat online', 'buy sheep', 'buy camel', 'poultry for sale', 'horse for sale',
    'health certified animals', 'verified animal sellers', 'live animals marketplace',
    'animal marketplace Pakistan', 'animal wellness', 'buy farm animals',
  ],
  alternates: {
    canonical: 'https://www.animalwellness.shop/buy',
  },
  openGraph: {
    title: 'Buy Animals | Animal Wellness',
    description: 'Browse and buy verified livestock and animals from trusted sellers. Cows, buffaloes, goats, poultry, horses and more.',
    url: 'https://www.animalwellness.shop/buy',
    siteName: 'Animal Wellness',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy Animals | Animal Wellness',
    description: 'Browse and buy verified livestock and animals from trusted sellers.',
  },
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
