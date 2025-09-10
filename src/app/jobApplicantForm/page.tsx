import { Metadata } from 'next'
import JobApplicantFormClient from './JobApplicantFormClient'

export const metadata: Metadata = {
  title: 'Job Application Form | Apply for Veterinary & Animal Care Jobs',
  description: 'Apply for jobs in veterinary sciences, animal care, livestock management, and agriculture sector. Submit your application for positions in veterinary clinics, farms, and animal healthcare companies across Pakistan.',
  keywords: [
    'veterinary jobs Pakistan',
    'animal care jobs',
    'livestock jobs',
    'veterinary job application',
    'animal doctor jobs',
    'farm jobs',
    'agriculture jobs',
    'veterinary assistant jobs',
    'animal healthcare careers',
    'poultry jobs',
    'dairy farm jobs',
    'cattle farm jobs',
    'veterinary technician jobs',
    'animal welfare jobs',
    'pet care jobs',
    'zoo jobs',
    'animal husbandry jobs'
  ].join(', '),
  openGraph: {
    title: 'Job Application Form | Veterinary & Animal Care Careers',
    description: 'Start your career in veterinary sciences and animal care. Apply for positions in veterinary clinics, livestock farms, and animal healthcare companies.',
    type: 'website',
    images: [
      {
        url: '/images/job-application-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Job Application - Veterinary & Animal Care Careers'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Application Form | Veterinary & Animal Care Jobs',
    description: 'Apply for veterinary and animal care positions. Join our network of animal healthcare professionals.',
    images: ['/images/job-application-og.jpg']
  },
  alternates: {
    canonical: '/jobApplicantForm'
  }
}

export default function JobApplicantFormPage() {
  return <JobApplicantFormClient />
}
