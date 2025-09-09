// src/app/applicant/[id]/page.tsx
import { Metadata } from 'next'
import ApplicantDetailClient from './ApplicantDetailClient'
import { getApiUrl } from '@/lib/utils'

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

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  try {
    const res = await fetch(`${getApiUrl()}/api/jobApplicant/${params.id}`, {
      next: { revalidate: 3600 }, // optional revalidation
    })

    if (!res.ok) {
      return {
        title: 'Applicant Not Found | Animal Wellness',
        description: 'The applicant profile you are looking for may no longer be available.',
      }
    }

    const data: Applicant = await res.json()

    // Format the description with key information
    const description = `${data.name} - ${data.expectedPosition || 'Job Applicant'} | ${data.qualification || data.highestDegree || 'Professional'} | ${data.preferredLocation || data.address}`

    return {
      title: `${data.name} - ${data.expectedPosition || 'Applicant'} `,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
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
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Job Applicant ',
      description: 'View professional profiles of job applicants at Animal Wellness.',
    }
  }
}

export default function Page() {
  return <ApplicantDetailClient />
}