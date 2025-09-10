import { Metadata } from 'next'
import AddCompanyClient from '@/components/forms/AddCompanyClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Add Company',
  description: 'Register a new company on our platform',
  keywords: ['add company', 'register company', 'company registration'],
}

export default async function AddCompanyPage() {
  return <AddCompanyClient />
}