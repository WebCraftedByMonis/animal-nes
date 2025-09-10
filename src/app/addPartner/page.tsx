import { Metadata } from 'next'
import AddPartnerClient from '@/components/forms/AddPartnerClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Add Partner',
  description: 'Register as a partner on our platform - veterinarians, sales partners, and more',
  keywords: ['add partner', 'partner registration', 'veterinarian registration', 'sales partner'],
}

export default async function AddPartnerPage() {
  return <AddPartnerClient />
}