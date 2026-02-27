import { Metadata } from 'next'
import VeterinaryPartnerDetailClient from '../VeterinaryPartnerDetailClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800

export async function generateStaticParams() {
  return []
}

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
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const res = await fetch(`${getApiUrl()}/api/partner/${id}`, {
      next: { revalidate: 1800 },
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
        data.shopName,
        data.qualificationDegree,
        data.specialization,
        data.species,
        data.cityName,
        data.state,
        data.areaTown,
        `veterinarian ${data.cityName ?? ''}`.trim(),
        `${data.specialization ?? ''} vet`.trim(),
        'veterinary',
        'veterinarian',
        'animal health',
        'pet care',
        'animal doctor Pakistan',
        'Animal Wellness',
      ].filter(Boolean),
      alternates: {
        canonical: `https://www.animalwellness.shop/Veternarians/${id}`,
      },
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Veterinary Partner | Animal Wellness',
      description: 'View our network of professional veterinary partners at Animal Wellness.',
    }
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let jsonLd = null

  try {
    const res = await fetch(`${getApiUrl()}/api/partner/${id}`, {
      next: { revalidate: 1800 },
    })
    if (res.ok) {
      const data: Partner = await res.json()
      const location = [data.areaTown, data.cityName, data.state].filter(Boolean).join(', ')
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Physician',
        name: data.partnerName,
        url: `https://www.animalwellness.shop/Veternarians/${id}`,
        telephone: data.partnerMobileNumber || undefined,
        email: data.partnerEmail || undefined,
        image: data.partnerImage?.url || undefined,
        medicalSpecialty: data.specialization || 'Veterinary Medicine',
        description: [data.qualificationDegree, data.specialization, data.species ? `Treats ${data.species}` : null]
          .filter(Boolean)
          .join('. '),
        address: location
          ? {
              '@type': 'PostalAddress',
              streetAddress: data.fullAddress || undefined,
              addressLocality: data.cityName || undefined,
              addressRegion: data.state || undefined,
              addressCountry: 'PK',
            }
          : undefined,
      }
    }
  } catch {
    // JSON-LD is non-critical, silently skip on error
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <VeterinaryPartnerDetailClient />
    </>
  )
}