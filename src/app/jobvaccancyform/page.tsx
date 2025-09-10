
import { Metadata } from 'next'
import JobVacancyFormClient from './JobVacancyFormClient'

export const metadata: Metadata = {
  title: 'Post a Job Vacancy | Hire Veterinary & Animal Care Professionals',
  description: 'Post job vacancies for veterinary positions, animal care roles, and livestock management jobs. Connect with qualified professionals in veterinary sciences, agriculture, and animal healthcare across Pakistan.',
  keywords: [
    'post veterinary jobs',
    'hire veterinarian',
    'post animal care jobs', 
    'veterinary job posting',
    'livestock manager jobs',
    'farm manager vacancy',
    'animal doctor hiring',
    'veterinary assistant vacancy',
    'poultry manager jobs',
    'dairy farm manager',
    'cattle manager jobs',
    'animal husbandry jobs',
    'veterinary technician hiring',
    'pet clinic jobs',
    'zoo veterinarian jobs',
    'agriculture jobs posting',
    'animal healthcare recruitment'
  ].join(', '),
  openGraph: {
    title: 'Post a Job Vacancy | Hire Veterinary Professionals',
    description: 'Find qualified veterinary and animal care professionals for your business. Post job vacancies for veterinary clinics, farms, and animal healthcare companies.',
    type: 'website',
    images: [
      {
        url: '/images/post-job-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Post Job Vacancy - Hire Veterinary Professionals'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Post a Job Vacancy | Hire Veterinary & Animal Care Staff',
    description: 'Connect with qualified veterinary professionals and animal care specialists. Post your job vacancy today.',
    images: ['/images/post-job-og.jpg']
  },
  alternates: {
    canonical: '/jobvaccancyform'
  }
}

export default function JobVacancyFormPage() {
  return <JobVacancyFormClient />
}
