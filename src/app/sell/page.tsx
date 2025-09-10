import { Metadata } from 'next'
import SellFormClient from './SellFormClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Sell Animal',
  description: 'Submit your animal for sale on our platform',
  keywords: ['sell animal', 'animal marketplace', 'livestock sale'],
}

export default async function SellPage() {
  return <SellFormClient />
}
