import { Metadata } from 'next'
import VeterinaryAssistantDetailClient from '../VeterinaryAssistantDetailClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800

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
  products: { id: number }[]
  createdAt: string
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
    const res = await fetch(`${getApiUrl()}/api/partner/${id}`, {
      next: { revalidate: 1800 },
    })

    if (!res.ok) {
      return {
        title: 'Veterinary Assistant Not Found | Animal Wellness',
        description: 'The veterinary assistant profile you are looking for may no longer be available.',
      }
    }

    const data: Partner = await res.json()

    // Create a description with key information
    const qualifications = [data.qualificationDegree, data.specialization].filter(Boolean).join(' • ')
    const location = [data.cityName, data.state].filter(Boolean).join(', ')
    const description = `${data.partnerName} - Veterinary Assistant at Animal Wellness${qualifications ? ` | ${qualifications}` : ''}${location ? ` | ${location}` : ''}${data.species ? ` | Specializes in ${data.species}` : ''}`

    return {
      title: ` ${data.partnerName} - Veterinary Assistant `,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
      openGraph: {
        title: ` ${data.partnerName} - Veterinary Assistant`,
        description: `${qualifications || 'Veterinary Assistant'} at Animal Wellness. ${data.species ? `Specializes in ${data.species}.` : ''} ${location ? `Located in ${location}.` : ''} Contact for professional veterinary services.`,
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
        description: `${qualifications || 'Veterinary Assistant'}${location ? ` in ${location}` : ''}`,
        images: data.partnerImage?.url ? [data.partnerImage.url] : [],
      },
      keywords: [
        data.partnerName,
        'veterinary assistant',
        'animal health',
        'pet care',
        data.specialization,
        data.cityName,
        data.state,
        'Animal Wellness',
      ].filter(Boolean).join(', '),
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Veterinary Assistant | Animal Wellness',
      description: 'View our network of professional veterinary assistants at Animal Wellness.',
    }
  }
}

export default function Page() {
  return <VeterinaryAssistantDetailClient />
}