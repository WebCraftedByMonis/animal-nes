// app/job-posts/[id]/page.tsx
import { Metadata } from 'next'
import JobPostDetailClient from './JobPostDetailClient'
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

async function getTraditionalJobPost(id: string): Promise<TraditionalJobPost | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/traditionaljobpost/${id}`, {
      next: { revalidate: 1800 },
      cache: 'force-cache'
    })

    if (!response.ok) {
      console.error('Failed to fetch traditional job post:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching traditional job post:', error)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const data = await getTraditionalJobPost(id)

    if (!data) {
      return {
        title: 'Traditional Job Post Not Found | Animal Wellness',
        description: 'The traditional job post you are looking for may no longer be available.',
      }
    }

    // Create a description from the job post content
    const cleanDescription = data.description.replace(/\n/g, ' ').trim()
    const shortDescription = cleanDescription.length > 155 
      ? cleanDescription.substring(0, 155) + '...'
      : cleanDescription

    // Format the posted date
    const postedDate = new Date(data.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return {
      title: `${data.title} | Traditional Job Posts | Animal Wellness`,
      description: shortDescription,
      openGraph: {
        title: data.title,
        description: cleanDescription.substring(0, 300), // Longer for OG
        type: 'article',
        publishedTime: data.createdAt,
        modifiedTime: data.updatedAt,
        images: data.image
          ? [
              {
                url: data.image.url,
                alt: data.image.alt || `${data.title} - Job Opening`,
                width: 1200,
                height: 630,
              },
            ]
          : [],
        siteName: 'Animal Wellness',
      },
      twitter: {
        card: 'summary_large_image',
        title: data.title,
        description: shortDescription,
        images: data.image?.url ? [data.image.url] : [],
      },
      keywords: [
        data.title,
        'traditional job posts',
        'career opportunities', 
        'job listings',
        'veterinary job openings',
        'animal care positions',
        'agriculture careers',
        'livestock management jobs',
        'farm jobs',
        'animal health careers',
        'Pakistan jobs'
      ].filter(Boolean),
      alternates: {
        canonical: `/traditionaljobposts/${id}`
      },
      other: {
        'article:published_time': data.createdAt,
        'article:modified_time': data.updatedAt,
        'article:section': 'Careers',
      },
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Traditional Job Posts | Animal Wellness',
      description: 'Explore traditional job opportunities in the veterinary and animal care industry at Animal Wellness.',
    }
  }
}

export default async function TraditionalJobPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const traditionalJobPost = await getTraditionalJobPost(id)
  
  return <JobPostDetailClient traditionalJobPost={traditionalJobPost} />
}