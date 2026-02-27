import { Metadata } from 'next'
import FarmerDetailClient from '../FarmerDetailClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800

interface Product {
  id: number
  productName: string
  genericName: string | null
  category: string
  image: {
    url: string
    alt: string
  } | null
  variants: {
    packingVolume: string
    customerPrice: number
  }[]
  company: {
    companyName: string
  }
}

interface Partner {
  id: number
  partnerName: string
  gender?: string
  partnerEmail?: string
  partnerMobileNumber?: string
  cityName?: string
  state?: string
  fullAddress?: string
  shopName?: string
  qualificationDegree?: string
  rvmpNumber?: string
  specialization?: string
  species?: string
  partnerType?: string
  bloodGroup?: string
  zipcode?: string
  areaTown?: string
  availableDaysOfWeek: { day: string }[]
  startTime?: { time: string }[]
  partnerImage: { url: string; publicId: string } | null
  products: Product[]
  createdAt: string
}

async function getPartner(id: string): Promise<Partner | null> {
  try {
    // Use absolute URL for server-side fetching
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/partner/${id}`, {
      next: { revalidate: 1800 },
      cache: 'force-cache'
    })

    if (!response.ok) {
      console.error('Failed to fetch partner:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching partner:', error)
    return null
  }
}

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const data = await getPartner(id)

    if (!data) {
      return {
        title: 'Farmer Not Found | Animal Wellness',
        description: 'The farmer profile you are looking for may no longer be available.',
      }
    }

    // Create a description with key information
    const qualifications = [data.qualificationDegree, data.specialization].filter(Boolean).join(' • ')
    const location = [data.cityName, data.state].filter(Boolean).join(', ')
    const description = `${data.partnerName} - Farmer at Animal Wellness${qualifications ? ` | ${qualifications}` : ''}${location ? ` | ${location}` : ''}`

    return {
      title: ` ${data.partnerName} - Farmer `,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
      openGraph: {
        title: ` ${data.partnerName} - Farmer`,
        description: `${qualifications || 'Farmer'} at Animal Wellness. ${location ? `Located in ${location}.` : ''} Connect with farmers and agricultural professionals.`,
        type: 'profile',
        images: data.partnerImage
          ? [
              {
                url: data.partnerImage.url,
                alt: `${data.partnerName}'s profile photo`,
                width: 1200,
                height: 630,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.partnerName} | Animal Wellness`,
        description: `${qualifications || 'Farmer'}${location ? ` in ${location}` : ''}`,
        images: data.partnerImage?.url ? [data.partnerImage.url] : [],
      },
      keywords: [
        data.partnerName,
        data.qualificationDegree,
        data.specialization,
        data.species,
        data.cityName,
        data.state,
        data.areaTown,
        data.shopName,
        `farmer ${data.cityName ?? ''}`.trim(),
        `${data.species ?? ''} farming`.trim(),
        'farmer',
        'agriculture',
        'livestock farming',
        'animal farming Pakistan',
        'Animal Wellness',
      ].filter(Boolean),
      alternates: {
        canonical: `https://www.animalwellness.shop/Farmers/${id}`,
      },
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Farmer | Animal Wellness',
      description: 'View our network of farmers at Animal Wellness.',
    }
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const partner = await getPartner(id)

  return <FarmerDetailClient partner={partner} />
}
