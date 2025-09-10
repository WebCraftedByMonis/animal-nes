import { Metadata } from 'next'
import AddCompanyClient from '@/components/forms/AddCompanyClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Add Company | Dashboard',
  description: 'Admin panel for registering new companies',
  keywords: ['dashboard', 'admin', 'add company', 'company management'],
}

export default async function DashboardAddCompanyPage() {
  return <AddCompanyClient />
}