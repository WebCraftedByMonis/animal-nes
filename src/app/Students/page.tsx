import { Metadata } from 'next'
import StudentsClient from './StudentsClient'

// Make this page dynamic - no ISR caching
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Students',
  description: 'Connect with students specializing in veterinary sciences, poultry, dairy, fisheries, science, and arts.',
  keywords: ['students', 'veterinary sciences', 'poultry', 'dairy', 'fisheries', 'science', 'arts', 'education'],
}

export default function StudentsPage() {
  return <StudentsClient />
}