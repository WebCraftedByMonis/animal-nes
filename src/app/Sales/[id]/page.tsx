// app/sales-partners/[id]/page.tsx
import { Metadata } from 'next'
import SalesPartnerDetailClient from '../SalesPartnerDetailClient'

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
    const res = await fetch(`${ 'https://www.animalwellness.shop'}/api/partner/${params.id}`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    if (!res.ok) {
      return {
        title: 'Sales Partner Not Found | Animal Wellness',
        description: 'The sales partner profile you are looking for may no longer be available.',
      }
    }

    const data: Partner = await res.json()

    // Create a description with key information
    const location = [ data.cityName, data.state].filter(Boolean).join(', ')
    const productCount = data.products.length
    const description = `${data.partnerName}${data.shopName ? ` - ${data.shopName}` : ''} | Sales & Marketing Partner at Animal Wellness${location ? ` | ${location}` : ''}${productCount > 0 ? ` | ${productCount} products available` : ''}`

    return {
      title: `${data.partnerName}${data.shopName ? ` - ${data.shopName}` : ''} `,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
      openGraph: {
        title: `${data.partnerName} - Sales & Marketing Partner`,
        description: `${data.shopName ? `Visit ${data.shopName} - ` : ''}Official Animal Wellness partner${location ? ` in ${location}` : ''}. ${productCount > 0 ? `${productCount} quality products available.` : 'Quality animal health products available.'} Contact us for best prices and service.`,
        type: 'website',
        images: data.partnerImage
          ? [
              {
                url: data.partnerImage.url,
                alt: data.shopName ? `${data.shopName} store photo` : `${data.partnerName}'s profile photo`,
                width: 1200,
                height: 630,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.partnerName} | Animal Wellness`,
        description: `${data.shopName || 'Sales Partner'}${location ? ` in ${location}` : ''}${productCount > 0 ? ` | ${productCount} products` : ''}`,
        images: data.partnerImage?.url ? [data.partnerImage.url] : [],
      },
      keywords: [
        data.partnerName,
        data.shopName,
        'animal wellness',
        'veterinary products',
        'animal health store',
        'pet supplies',
        data.cityName,
        data.state,
        data.areaTown,
        'sales partner',
      ].filter(Boolean).join(', '),
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Sales Partner | Animal Wellness',
      description: 'View our network of sales and marketing partners at Animal Wellness.',
    }
  }
}

export default function Page() {
  return <SalesPartnerDetailClient />
}