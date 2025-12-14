import { Metadata } from 'next'
import CompaniesClient from './CompaniesClient'

export const metadata: Metadata = {
  title: 'Partner Companies',
  description: 'Explore our trusted partner companies providing quality veterinary products and animal wellness solutions',
  keywords: ['partner companies', 'veterinary companies', 'animal wellness partners', 'pharmaceutical companies'],
}

export default function AllCompaniesPage() {
  return <CompaniesClient initialCompanies={[]} initialTotal={0} />
}