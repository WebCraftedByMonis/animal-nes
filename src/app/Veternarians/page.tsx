import { Metadata } from 'next'
import VeterinariansClient from './VeterinariansClient'

// Make this page dynamic - no ISR caching
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Veterinary Partners',
  description: 'Connect with qualified veterinary professionals in your area. Find experienced veterinarians for your animal care needs.',
  keywords: ['veterinary partners', 'veterinarians', 'animal doctors', 'pet care professionals', 'livestock veterinarians'],
}

export default function VeterinaryPartnersPage() {
  return <VeterinariansClient />
}
