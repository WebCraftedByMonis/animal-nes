// app/veterinary-partners/[id]/page.tsx
import { Metadata } from 'next'
import VeterinaryPartnerDetailClient from '../VeterinaryPartnerDetailClient'

interface Partner {
  id: number
  partnerName: string
  gender?: string
  partnerEmail?: string
  partnerMobileNumber?: string
  cityName?: string
  state?: string
  fullAddress?: string
  shopName?: string
  qualificationDegree?: string
  rvmpNumber?: string
  specialization?: string
  species?: string
  partnerType?: string
  bloodGroup?: string
  zipcode?: string
  areaTown?: string
  availableDaysOfWeek: { day: string }[]
  partnerImage: { url: string; publicId: string } | null
  products: { id: number }[]
  createdAt: string
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.animalwellness.shop'}/api/partner/${params.id}`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    if (!res.ok) {
      return {
        title: 'Veterinary Partner Not Found | Animal Wellness',
        description: 'The veterinary partner profile you are looking for may no longer be available.',
      }
    }

    const data: Partner = await res.json()

    // Create a description with key information
    const qualifications = [data.qualificationDegree, data.specialization].filter(Boolean).join(' • ')
    const location = [data.cityName, data.state].filter(Boolean).join(', ')
    const description = `${data.partnerName} - Veterinary Partner at Animal Wellness${qualifications ? ` | ${qualifications}` : ''}${location ? ` | ${location}` : ''}${data.species ? ` | Specializes in ${data.species}` : ''}`

    return {
      title: ` ${data.partnerName} - Veterinary Partner `,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
      openGraph: {
        title: ` ${data.partnerName} - Veterinary Professional`,
        description: `${qualifications || 'Veterinary Partner'} at Animal Wellness. ${data.species ? `Specializes in ${data.species}.` : ''} ${location ? `Located in ${location}.` : ''} Contact for professional veterinary services.`,
        type: 'profile',
        images: data.partnerImage
          ? [
              {
                url: data.partnerImage.url,
                alt: `Dr. ${data.partnerName}'s profile photo`,
                width: 1200,
                height: 630,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `Dr. ${data.partnerName} | Animal Wellness`,
        description: `${qualifications || 'Veterinary Partner'}${location ? ` in ${location}` : ''}`,
        images: data.partnerImage?.url ? [data.partnerImage.url] : [],
      },
      keywords: [
        data.partnerName,
        'veterinary',
        'veterinarian',
        'animal health',
        'pet care',
        data.specialization,
        data.cityName,
        data.state,
        'Animal Wellness',
      ].filter(Boolean).join(', '),
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Veterinary Partner | Animal Wellness',
      description: 'View our network of professional veterinary partners at Animal Wellness.',
    }
  }
}

export default function Page() {
  return <VeterinaryPartnerDetailClient />
}