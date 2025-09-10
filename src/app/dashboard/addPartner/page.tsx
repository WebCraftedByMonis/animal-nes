import { Metadata } from 'next'
import AddPartnerClient from '@/components/forms/AddPartnerClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Add Partner | Dashboard',
  description: 'Admin panel for registering new partners',
  keywords: ['dashboard', 'admin', 'add partner', 'partner management'],
}

export default async function DashboardAddPartnerPage() {
  return <AddPartnerClient />
}