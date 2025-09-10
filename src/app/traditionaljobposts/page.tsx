import { Metadata } from 'next'
import TraditionalJobPostsClient from './TraditionalJobPostsClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

interface TraditionalJobPost {
  id: number
  title: string
  description: string
  image: { url: string; alt: string; publicId: string | null } | null
  createdAt: string
  updatedAt: string
}

async function getInitialTraditionalJobPosts(): Promise<TraditionalJobPost[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/traditionaljobpost?page=1&limit=8&sortBy=id&sortOrder=desc`, {
      next: { revalidate: 1800 },
      cache: 'force-cache'
    })

    if (!response.ok) {
      console.error('Failed to fetch traditional job posts:', response.status, response.statusText)
      return []
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching initial traditional job posts:', error)
    return []
  }
}

export const metadata: Metadata = {
  title: 'Traditional Job Posts | Browse Career Opportunities',
  description: 'Browse traditional job postings and career opportunities in veterinary sciences, animal care, agriculture, and livestock management. Find your next career opportunity from employers across Pakistan.',
  keywords: [
    'traditional job posts',
    'career opportunities',
    'job listings',
    'veterinary job openings',
    'animal care positions',
    'agriculture careers',
    'livestock management jobs',
    'farm jobs',
    'veterinary assistant openings',
    'animal doctor positions',
    'poultry farm jobs',
    'dairy farm careers',
    'cattle management positions',
    'animal husbandry jobs',
    'veterinary technician roles',
    'pet care jobs',
    'zoo positions'
  ].join(', '),
  openGraph: {
    title: 'Traditional Job Posts | Career Opportunities',
    description: 'Discover career opportunities in veterinary sciences, animal care, and agriculture. Browse job postings from employers looking for qualified professionals.',
    type: 'website',
    images: [
      {
        url: '/images/traditional-jobs-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Traditional Job Posts - Career Opportunities'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Traditional Job Posts | Find Your Next Career',
    description: 'Browse job opportunities in veterinary sciences, animal care, and agriculture industries.',
    images: ['/images/traditional-jobs-og.jpg']
  },
  alternates: {
    canonical: '/traditionaljobposts'
  }
}

interface TraditionalJobPost {
  id: number
  title: string
  description: string
  image: { url: string; alt: string; publicId: string | null } | null
  createdAt: string
  updatedAt: string
}

export default async function TraditionalJobPostsPage() {
  const initialJobPosts = await getInitialTraditionalJobPosts()
  
  return <TraditionalJobPostsClient initialJobPosts={initialJobPosts} />
}

