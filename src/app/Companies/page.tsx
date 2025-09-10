import { Metadata } from 'next'
import CompaniesClient from './CompaniesClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: 'Partner Companies',
  description: 'Explore our trusted partner companies providing quality veterinary products and animal wellness solutions',
  keywords: ['partner companies', 'veterinary companies', 'animal wellness partners', 'pharmaceutical companies'],
}

interface Company {
  id: number
  companyName: string
  mobileNumber: string | null
  address: string | null
  email: string | null
  image: { url: string; alt: string; publicId: string | null } | null
  products: { id: number }[]
  createdAt: string
}

async function getInitialCompanies(): Promise<{
  companies: Company[]
  total: number
}> {
  try {
    const response = await fetch(`${getApiUrl()}/api/company?sortBy=id&sortOrder=asc&page=1&limit=8`, {
      next: { revalidate: 1800 }
    })

    if (!response.ok) {
      console.error('Failed to fetch companies:', response.status)
      return { companies: [], total: 0 }
    }

    const data = await response.json()

    return {
      companies: data.data || [],
      total: data.total || 0
    }
  } catch (error) {
    console.error('Error fetching initial companies:', error)
    return { companies: [], total: 0 }
  }
}

export default async function AllCompaniesPage() {
  const { companies, total } = await getInitialCompanies()
  
  return <CompaniesClient initialCompanies={companies} initialTotal={total} />
}