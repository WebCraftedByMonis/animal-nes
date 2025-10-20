import { Metadata } from 'next'
import VeterinaryAssistantsClient from './VeterinaryAssistantsClient'

// Make this page dynamic - no ISR caching
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Veterinary Assistants',
  description: 'Find experienced veterinary assistants specialized in extension services, deworming, vaccination, and artificial insemination.',
  keywords: ['veterinary assistants', 'extension services', 'deworming', 'vaccination', 'artificial insemination', 'animal care'],
}

export default function VeterinaryAssistantsPage() {
  return <VeterinaryAssistantsClient />
}