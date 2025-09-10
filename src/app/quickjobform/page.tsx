import { Metadata } from 'next'
import QuickJobFormClient from './QuickJobFormClient'

export const metadata: Metadata = {
  title: 'Post Quick Job | Traditional Job Posting Form',
  description: 'Create and post traditional job listings quickly. Add job title, description, and company image for veterinary, animal care, and agriculture positions. Simple form for employers to post jobs.',
  keywords: [
    'quick job posting',
    'traditional job post',
    'create job listing',
    'post job vacancy',
    'employer job form',
    'veterinary job posting',
    'animal care job form',
    'agriculture job posting',
    'livestock job listing',
    'farm job posting',
    'job post creation',
    'employment posting',
    'job advertisement form',
    'hire employees',
    'job posting platform',
    'recruitment form',
    'job listing creation'
  ].join(', '),
  openGraph: {
    title: 'Post Quick Job | Create Job Listing',
    description: 'Quickly create and post job listings for veterinary, animal care, and agriculture positions. Simple form for employers.',
    type: 'website',
    images: [
      {
        url: '/images/quick-job-form-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Quick Job Posting Form'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Post Quick Job | Traditional Job Posting',
    description: 'Create job listings quickly with our simple job posting form.',
    images: ['/images/quick-job-form-og.jpg']
  },
  alternates: {
    canonical: '/quickjobform'
  }
}

export default function QuickJobFormPage() {
  return <QuickJobFormClient />
}