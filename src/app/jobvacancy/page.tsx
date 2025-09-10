import { Metadata } from 'next'
import JobVacancyClient from './JobVacancyClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: 'Job Vacancies | Veterinary & Animal Care Career Opportunities',
  description: 'Browse current job openings in veterinary sciences, animal care, livestock management, and agriculture. Find your next career opportunity with top employers in the animal healthcare industry.',
  keywords: [
    'veterinary jobs',
    'animal care careers',
    'livestock management jobs',
    'veterinary assistant positions',
    'animal doctor jobs',
    'farm manager vacancies',
    'poultry jobs',
    'dairy farm careers',
    'cattle management jobs',
    'veterinary technician openings',
    'pet clinic jobs',
    'animal hospital careers',
    'agriculture job openings',
    'animal husbandry jobs',
    'veterinary clinic positions',
    'animal welfare careers',
    'zoo veterinarian jobs'
  ].join(', '),
  openGraph: {
    title: 'Job Vacancies | Veterinary & Animal Care Opportunities',
    description: 'Discover exciting career opportunities in veterinary sciences and animal care. Browse current job openings from leading employers in the industry.',
    type: 'website',
    images: [
      {
        url: '/images/job-vacancies-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Job Vacancies - Veterinary & Animal Care Careers'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Vacancies | Find Your Next Veterinary Career',
    description: 'Browse current job openings in veterinary sciences, animal care, and livestock management.',
    images: ['/images/job-vacancies-og.jpg']
  },
  alternates: {
    canonical: '/jobvacancy'
  }
}

interface JobFormImage {
  id: string;
  url: string;
  alt: string;
  publicId: string;
}

interface JobForm {
  id: string;
  name: string;
  company: string;
  mobileNumber: string;
  email?: string;
  position: string;
  eligibility: string;
  benefits: string;
  location: string;
  deadline: string;
  noofpositions: string;
  companyAddress: string;
  howToApply: string;
  jobFormImage?: JobFormImage;
  createdAt: string;
}

async function getInitialJobVacancies(): Promise<{ jobForms: JobForm[], total: number }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/vacancyForm?page=1&limit=12&sortBy=createdAt&sortOrder=desc`, {
      next: { revalidate: 1800 },
      cache: 'force-cache'
    })

    if (!response.ok) {
      console.error('Failed to fetch job vacancies:', response.status, response.statusText)
      return { jobForms: [], total: 0 }
    }

    const data = await response.json()
    console.log('Fetched job vacancies data:', data)
    return {
      jobForms: data.data || [],
      total: data.total || 0
    }
  } catch (error) {
    console.error('Error fetching initial job vacancies:', error)
    return { jobForms: [], total: 0 }
  }
}

export default async function JobVacancyPage() {
  const { jobForms, total } = await getInitialJobVacancies()
  
  return <JobVacancyClient initialJobForms={jobForms} initialTotal={total} />
}