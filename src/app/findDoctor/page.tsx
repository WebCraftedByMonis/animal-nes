import { Metadata } from 'next'
import FindDoctorClient from './FindDoctorClient'

export const metadata: Metadata = {
  title: 'Find a Veterinarian | Book Animal Doctor Appointment Online',
  description: 'Find qualified veterinarians near you for your animals. Book appointments for cattle, poultry, pets, and livestock. Emergency and regular veterinary services available across Pakistan.',
  keywords: [
    'veterinarian near me',
    'animal doctor',
    'livestock veterinarian', 
    'pet doctor',
    'cattle doctor',
    'poultry veterinarian',
    'emergency vet',
    'book vet appointment',
    'animal healthcare Pakistan',
    'veterinary services',
    'farm animal doctor',
    'cow doctor',
    'buffalo doctor',
    'goat doctor',
    'sheep doctor',
    'horse doctor',
    'camel doctor'
  ].join(', '),
  openGraph: {
    title: 'Find a Veterinarian | Book Animal Doctor Appointment',
    description: 'Connect with qualified veterinarians for your animals. Professional veterinary care for livestock, poultry, and pets across Pakistan.',
    type: 'website',
    images: [
      {
        url: '/images/find-doctor-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Find a Veterinarian - Animal Healthcare Services'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find a Veterinarian | Book Animal Doctor Appointment',
    description: 'Connect with qualified veterinarians for your animals. Professional veterinary care for livestock, poultry, and pets.',
    images: ['/images/find-doctor-og.jpg']
  },
  alternates: {
    canonical: '/findDoctor'
  }
}

export default function FindDoctorPage() {
  return <FindDoctorClient />
}