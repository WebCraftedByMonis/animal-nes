import { Metadata } from 'next'
import VeterinariansClient from './VeterinariansClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: 'Veterinary Partners',
  description: 'Connect with qualified veterinary professionals in your area. Find experienced veterinarians for your animal care needs.',
  keywords: ['veterinary partners', 'veterinarians', 'animal doctors', 'pet care professionals', 'livestock veterinarians'],
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
  partnerImage: { url: string; publicId: string } | null
  products: { id: number }[]
  createdAt: string
}

async function getInitialVeterinarians(): Promise<Partner[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/partner?sortBy=createdAt&order=desc&partnerTypeGroup=veterinarian`, {
      next: { revalidate: 1800 }
    })

    if (!response.ok) {
      console.error('Failed to fetch veterinarians:', response.status)
      return []
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching initial veterinarians:', error)
    return []
  }
}

export default async function VeterinaryPartnersPage() {
  const partners = await getInitialVeterinarians()
  
  return <VeterinariansClient initialPartners={partners} />
}
