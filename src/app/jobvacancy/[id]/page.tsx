import { Metadata } from 'next'
import JobFormDetailClient from './JobFormDetailClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export async function generateStaticParams() {
  return []
}

interface JobForm {
  id: number
  name: string
  company: string
  mobileNumber: string
  email?: string
  position: string
  eligibility: string
  benefits: string
  location: string
  deadline: string
  noofpositions: string
  companyAddress: string
  howToApply: string
  createdAt: string
  updatedAt: string
  jobFormImage?: {
    id: number
    url: string
    alt: string
    publicId: string
  } | null
}

async function getJobVacancy(id: string): Promise<JobForm | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/vacancyForm/${id}`, {
      next: { revalidate: 1800 },
      cache: 'force-cache'
    })

    if (!response.ok) {
      console.error('Failed to fetch job vacancy:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching job vacancy:', error)
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
    const data = await getJobVacancy(id)

    if (!data) {
      return {
        title: 'Job Not Found | Animal Wellness',
        description: 'The job you are looking for may no longer be available.',
      }
    }

    const description = `Apply for ${data.position} at ${data.company} in ${data.location}. ${data.eligibility}. Deadline: ${new Date(data.deadline).toLocaleDateString()}`

    return {
      title: `${data.position} at ${data.company} | Animal Wellness Jobs`,
      description: description.substring(0, 160),
      keywords: [
        data.position,
        data.company,
        data.location,
        'veterinary jobs',
        'animal care careers',
        'job vacancy',
        'apply now',
        data.eligibility || 'professional'
      ].filter(Boolean).join(', '),
      openGraph: {
        title: `${data.position} at ${data.company}`,
        description: `${data.position} opportunity at ${data.company} in ${data.location}. Apply by ${new Date(data.deadline).toLocaleDateString()}.`,
        type: 'website',
        images: data.jobFormImage
          ? [
              {
                url: data.jobFormImage.url,
                alt: data.jobFormImage.alt ?? data.position,
                width: 1200,
                height: 630,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.position} at ${data.company}`,
        description: `Location: ${data.location} | Deadline: ${new Date(data.deadline).toLocaleDateString()}`,
        images: data.jobFormImage?.url ? [data.jobFormImage.url] : [],
      },
      alternates: {
        canonical: `/jobvacancy/${id}`
      }
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Job Vacancy | Animal Wellness',
      description: 'Explore career opportunities at Animal Wellness.',
    }
  }
}

export default async function JobVacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const jobVacancy = await getJobVacancy(id)
  
  return <JobFormDetailClient jobVacancy={jobVacancy} />
}
