import { Metadata } from 'next'
import AnimalDetailClient from './AnimalDetailClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800

interface SellAnimal {
  id: number
  specie: string
  breed: string
  location: string
  quantity: number
  ageType: string
  ageNumber: number
  weightType: string
  weightValue: number
  gender: string
  healthCertificate: boolean
  totalPrice: number
  purchasePrice: number
  referredBy: string | null
  status: string
  createdAt: string
  user: {
    name: string
    email: string
  }
  images: { id: number; url: string; alt: string }[]
  videos: { id: number; url: string; alt: string }[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const res = await fetch(`${getApiUrl()}/api/sell-animal/${id}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!res.ok) {
      return {
        title: 'Animal Not Found | Animal Wellness',
        description: 'The animal you are looking for may no longer be available.',
      }
    }

    const data: SellAnimal = await res.json()

    // Create a descriptive title and description
    const age = `${data.ageNumber} ${data.ageType}`
    const weight = `${data.weightValue} ${data.weightType}`
    const healthStatus = data.healthCertificate ? 'Health Certified' : ''
    
    const title = `${data.specie} - ${data.breed} for Sale | Animal Wellness`
    const description = `${data.gender} ${data.specie} (${data.breed}) available in ${data.location}. Age: ${age}, Weight: ${weight}. Price: PKR ${data.totalPrice.toLocaleString()}. ${healthStatus}`.trim()

    return {
      title,
      description,
      keywords: [
        data.specie,
        data.breed,
        `${data.specie} for sale`,
        `${data.breed} for sale`,
        `${data.specie} ${data.breed}`,
        data.location,
        data.gender,
        `${data.ageNumber} ${data.ageType} ${data.specie}`,
        `${data.weightValue} ${data.weightType}`,
        data.healthCertificate ? 'health certified animal' : null,
        'buy animals online',
        'live animals for sale',
        'livestock Pakistan',
        'animal marketplace',
        'animal wellness',
      ].filter(Boolean),
      openGraph: {
        title,
        description,
        type: 'website',
        images: data.images.length > 0
          ? [
              {
                url: data.images[0].url,
                alt: data.images[0].alt || `${data.specie} - ${data.breed}`,
                width: 1200,
                height: 630,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: `${data.gender} ${data.specie} in ${data.location} - PKR ${data.totalPrice.toLocaleString()}`,
        images: data.images.length > 0 ? [data.images[0].url] : [],
      },
      alternates: {
        canonical: `https://www.animalwellness.shop/buy/${id}`,
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Animals for Sale | Animal Wellness',
      description: 'Browse quality animals available for purchase at Animal Wellness.',
    }
  }
}

export default function Page() {
  return <AnimalDetailClient />
}