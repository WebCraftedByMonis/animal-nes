// app/job-posts/[id]/page.tsx
import { Metadata } from 'next'
import JobPostDetailClient from './JobPostDetailClient'
interface TraditionalJobPost {
  id: number
  title: string
  description: string
  image: { url: string; alt: string; publicId: string | null } | null
  createdAt: string
  updatedAt: string
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  try {
    const res = await fetch(`${ 'https://www.animalwellness.shop'}/api/traditionaljobpost/${params.id}`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    if (!res.ok) {
      return {
        title: 'Job Post Not Found | Animal Wellness Careers',
        description: 'The job posting you are looking for may no longer be available or has been filled.',
      }
    }

    const data: TraditionalJobPost = await res.json()

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
      title: `${data.title} | Animal Wellness Careers`,
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
        'animal wellness jobs',
        'veterinary careers',
        'animal care jobs',
        'pet industry jobs',
        'veterinary employment',
        'animal health careers',
      ].filter(Boolean),
      other: {
        'article:published_time': data.createdAt,
        'article:modified_time': data.updatedAt,
        'article:section': 'Careers',
      },
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Job Opportunities | Animal Wellness Careers',
      description: 'Explore exciting career opportunities in the veterinary and animal care industry at Animal Wellness.',
    }
  }
}

export default function Page() {
  return <JobPostDetailClient />
}