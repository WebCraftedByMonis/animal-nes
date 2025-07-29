// src/app/jobvacancy/[id]/page.tsx
import { Metadata } from 'next'
import JobFormDetailClient from './JobFormDetailClient'

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

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  try {
    const res = await fetch(`https://www.animalwellness.shop/api/vacancyForm/${params.id}`, {
      next: { revalidate: 3600 }, // optional revalidation
    })

    if (!res.ok) {
      return {
        title: 'Job Not Found ',
        description: 'The job you are looking for may no longer be available.',
      }
    }

    const data: JobForm = await res.json()

    return {
      title: `${data.position} at ${data.company} `,
      description: `Apply for ${data.position} at ${data.company} in ${data.location}. Deadline: ${data.deadline}`,
      openGraph: {
        images: data.jobFormImage
          ? [
              {
                url: data.jobFormImage.url,
                alt: data.jobFormImage.alt ?? data.position,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.position} at ${data.company}`,
        description: `Location: ${data.location}, Deadline: ${data.deadline}`,
        images: data.jobFormImage?.url ? [data.jobFormImage.url] : [],
      },
    }
  } catch (e) {
    return {
      title: 'Job Vacancy ',
      description: 'Explore career opportunities at Animal Wellness.',
    }
  }
}

export default function Page() {
  return <JobFormDetailClient />
}
