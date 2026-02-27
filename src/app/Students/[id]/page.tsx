import { Metadata } from 'next'
import StudentDetailClient from '../StudentDetailClient'
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
        title: 'Student Not Found | Animal Wellness',
        description: 'The student profile you are looking for may no longer be available.',
      }
    }

    // Create a description with key information
    const qualifications = [data.qualificationDegree, data.specialization].filter(Boolean).join(' • ')
    const location = [data.cityName, data.state].filter(Boolean).join(', ')
    const description = `${data.partnerName} - Student at Animal Wellness${qualifications ? ` | ${qualifications}` : ''}${location ? ` | ${location}` : ''}${data.species ? ` | Interested in ${data.species}` : ''}`

    return {
      title: ` ${data.partnerName} - Student `,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
      openGraph: {
        title: ` ${data.partnerName} - Student`,
        description: `${qualifications || 'Student'} at Animal Wellness. ${data.species ? `Interested in ${data.species}.` : ''} ${location ? `Located in ${location}.` : ''} Connect with fellow students and professionals.`,
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
        description: `${qualifications || 'Student'}${location ? ` in ${location}` : ''}`,
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
        `animal sciences student ${data.cityName ?? ''}`.trim(),
        'student',
        'animal sciences',
        'veterinary student',
        'education',
        'Animal Wellness',
      ].filter(Boolean),
      alternates: {
        canonical: `https://www.animalwellness.shop/Students/${id}`,
      },
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Student | Animal Wellness',
      description: 'View our network of students at Animal Wellness.',
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
  
  return <StudentDetailClient partner={partner} />
}