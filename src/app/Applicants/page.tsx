import { Metadata } from 'next'
import ApplicantsClient from './ApplicantsClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: 'Job Applicants | View Veterinary & Animal Care Candidates',
  description: 'Browse qualified job applicants for veterinary and animal care positions. View candidate profiles, CVs, and contact information for veterinary jobs, livestock management, and animal healthcare roles.',
  keywords: [
    'job applicants',
    'veterinary candidates',
    'animal care applicants',
    'livestock manager candidates',
    'veterinary assistant applicants',
    'farm manager candidates',
    'animal doctor applicants',
    'poultry manager candidates',
    'dairy farm candidates',
    'cattle manager applicants',
    'veterinary technician candidates',
    'animal husbandry applicants',
    'pet care candidates',
    'agriculture job applicants',
    'animal healthcare candidates',
    'veterinary recruitment',
    'hiring veterinary staff'
  ].join(', '),
  openGraph: {
    title: 'Job Applicants | Veterinary & Animal Care Candidates',
    description: 'Find qualified candidates for your veterinary and animal care positions. Browse applicant profiles and hire the best talent for your business.',
    type: 'website',
    images: [
      {
        url: '/images/applicants-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Job Applicants - Veterinary Candidates'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Applicants | View Veterinary Candidates',
    description: 'Browse qualified veterinary and animal care job applicants. Find the perfect candidate for your team.',
    images: ['/images/applicants-og.jpg']
  },
  alternates: {
    canonical: '/Applicants'
  }
}

interface Applicant {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  mobileNumber: string;
  address: string;
  qualification?: string;
  dateOfBirth: string;
  expectedPosition?: string;
  expectedSalary?: string;
  preferredIndustry?: string;
  preferredLocation?: string;
  highestDegree?: string;
  degreeInstitution?: string;
  majorFieldOfStudy?: string;
  workExperience?: string;
  previousCompany?: string;
  declaration: 'AGREED' | 'NOT_AGREED';
  image?: { url: string; alt: string } | null;
  cv?: { url: string; alt: string } | null;
}

async function getInitialApplicants(): Promise<{ applicants: Applicant[], total: number }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/jobApplicant?page=1&limit=8&declaration=AGREED`, {
      next: { revalidate: 1800 },
      cache: 'force-cache'
    })

    if (!response.ok) {
      console.error('Failed to fetch applicants:', response.status, response.statusText)
      return { applicants: [], total: 0 }
    }

    const data = await response.json()
    console.log('Fetched applicants data:', data)
    return {
      applicants: data.data || [],
      total: data.total || 0
    }
  } catch (error) {
    console.error('Error fetching initial applicants:', error)
    return { applicants: [], total: 0 }
  }
}

export default async function ApplicantsPage() {
  const { applicants, total } = await getInitialApplicants()
  
  return <ApplicantsClient initialApplicants={applicants} initialTotal={total} />
}
