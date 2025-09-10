import { Metadata } from 'next'
import StudentsClient from './StudentsClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: 'Students',
  description: 'Connect with students specializing in veterinary sciences, poultry, dairy, fisheries, science, and arts.',
  keywords: ['students', 'veterinary sciences', 'poultry', 'dairy', 'fisheries', 'science', 'arts', 'education'],
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
  availableDaysOfWeek: { day: string }[]
  partnerImage: { url: string; publicId: string } | null
  products: { id: number }[]
  createdAt: string
}

async function getInitialStudents(): Promise<Partner[]> {
  try {
    // Use absolute URL for server-side fetching
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/partner?partnerTypeGroup=student&page=1&limit=12`, {
      next: { revalidate: 1800 },
      cache: 'force-cache'
    })

    if (!response.ok) {
      console.error('Failed to fetch students:', response.status, response.statusText)
      return []
    }

    const data = await response.json()
    console.log('Fetched students data:', data)
    return data.data || []
  } catch (error) {
    console.error('Error fetching initial students:', error)
    return []
  }
}

export default async function StudentsPage() {
  const partners = await getInitialStudents()
  
  return <StudentsClient initialPartners={partners} />
}