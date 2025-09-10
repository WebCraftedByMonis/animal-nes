import { Metadata } from 'next'
import SalesClient from './SalesClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: 'Sales Partners',
  description: 'Connect with trusted retailers and distributors in your area. Find sales and marketing partners for animal care products.',
  keywords: ['sales partners', 'distributors', 'retailers', 'animal care', 'marketing partners'],
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

async function getInitialSalesPartners(): Promise<Partner[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/partner?sortBy=createdAt&order=desc&partnerTypeGroup=sales`, {
      next: { revalidate: 1800 }
    })

    if (!response.ok) {
      console.error('Failed to fetch sales partners:', response.status)
      return []
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching initial sales partners:', error)
    return []
  }
}

export default async function SalesPartnersPage() {
  const partners = await getInitialSalesPartners()
  
  return <SalesClient initialPartners={partners} />
}
