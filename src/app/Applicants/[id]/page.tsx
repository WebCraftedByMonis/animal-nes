import { Metadata } from 'next'
import ApplicantDetailClient from './ApplicantDetailClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export async function generateStaticParams() {
  return []
}

interface Applicant {
  id: number
  name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  mobileNumber: string
  address: string
  qualification?: string
  dateOfBirth: string
  expectedPosition?: string
  expectedSalary?: string
  preferredIndustry?: string
  preferredLocation?: string
  highestDegree?: string
  degreeInstitution?: string
  majorFieldOfStudy?: string
  workExperience?: string
  previousCompany?: string
  declaration: 'AGREED' | 'NOT_AGREED'
  image?: { url: string; alt: string } | null
  cv?: { url: string; alt: string } | null
}

async function getApplicant(id: string): Promise<Applicant | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/jobApplicant/${id}`, {
      next: { revalidate: 1800 },
      cache: 'force-cache'
    })

    if (!response.ok) {
      console.error('Failed to fetch applicant:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching applicant:', error)
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
    const data = await getApplicant(id)

    if (!data) {
      return {
        title: 'Applicant Not Found | Animal Wellness',
        description: 'The applicant profile you are looking for may no longer be available.',
      }
    }

    // Format the description with key information
    const description = `${data.name} - ${data.expectedPosition || 'Job Applicant'} | ${data.qualification || data.highestDegree || 'Professional'} | ${data.preferredLocation || data.address}`

    return {
      title: `${data.name} - ${data.expectedPosition || 'Applicant'} | Animal Wellness`,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
      keywords: [
        data.name,
        data.expectedPosition,
        data.qualification,
        data.highestDegree,
        data.majorFieldOfStudy,
        data.degreeInstitution,
        data.preferredIndustry,
        data.preferredLocation,
        data.previousCompany,
        `${data.expectedPosition ?? 'job applicant'} Pakistan`,
        'veterinary candidate',
        'animal care applicant',
        'job seeker',
        'animal wellness careers',
      ].filter(Boolean),
      openGraph: {
        title: `${data.name} - ${data.expectedPosition || 'Job Applicant'}`,
        description: `View ${data.name}'s professional profile. ${data.qualification ? `Qualification: ${data.qualification}` : ''} ${data.workExperience ? `| Experience: ${data.workExperience}` : ''}`,
        type: 'profile',
        images: data.image
          ? [
              {
                url: data.image.url,
                alt: data.image.alt || `${data.name}'s profile photo`,
                width: 1200,
                height: 630,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.name} - ${data.expectedPosition || 'Applicant'}`,
        description: `${data.qualification || data.highestDegree || 'Professional'} | ${data.preferredLocation || 'Location not specified'}`,
        images: data.image?.url ? [data.image.url] : [],
      },
      alternates: {
        canonical: `/Applicants/${id}`
      }
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Job Applicant | Animal Wellness',
      description: 'View professional profiles of job applicants at Animal Wellness.',
    }
  }
}

export default async function ApplicantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const applicant = await getApplicant(id)
  
  return <ApplicantDetailClient applicant={applicant} />
}