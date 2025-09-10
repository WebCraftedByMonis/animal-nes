import { Metadata } from 'next'
import VeterinaryAssistantsClient from './VeterinaryAssistantsClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: 'Veterinary Assistants',
  description: 'Find experienced veterinary assistants specialized in extension services, deworming, vaccination, and artificial insemination.',
  keywords: ['veterinary assistants', 'extension services', 'deworming', 'vaccination', 'artificial insemination', 'animal care'],
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

async function getInitialVeterinaryAssistants(): Promise<Partner[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/partner?partnerTypeGroup=veterinary_assistant&page=1&limit=12`, {
      next: { revalidate: 1800 }
    })

    if (!response.ok) {
      console.error('Failed to fetch veterinary assistants:', response.status)
      return []
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching initial veterinary assistants:', error)
    return []
  }
}

export default async function VeterinaryAssistantsPage() {
  const partners = await getInitialVeterinaryAssistants()
  
  return <VeterinaryAssistantsClient initialPartners={partners} />
}