import { Metadata } from 'next'
import CompanyDetailClient from './CompanyDetailClient'
import { getApiUrl } from '@/lib/utils'

export const revalidate = 1800

export async function generateStaticParams() {
  return []
}

interface Company {
  id: number
  companyName: string
  mobileNumber: string | null
  address: string | null
  email: string | null
  image: { url: string; alt: string; publicId: string | null } | null
  products: {
    id: number
    productName: string
    category: string
  }[]
  createdAt: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const res = await fetch(`${getApiUrl()}/api/company/${id}`, {
      next: { revalidate: 1800 },
    })

    if (!res.ok) {
      return {
        title: 'Company Not Found | Animal Wellness',
        description: 'The company profile you are looking for may no longer be available.',
      }
    }

    const data: Company = await res.json()

    // Create a description with key information
    const productCount = data.products.length
    const categories = [...new Set(data.products.map(p => p.category))].slice(0, 3).join(', ')
    const description = `${data.companyName} - Partner company at Animal Wellness | ${productCount} products available${categories ? ` in ${categories}` : ''} | ${data.address || 'Contact us for more information'}`

    return {
      title: `${data.companyName} - Products & Company Profile | Animal Wellness`,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
      openGraph: {
        title: `${data.companyName} - Animal Wellness Partner`,
        description: `Explore ${productCount} products from ${data.companyName}. ${categories ? `Categories: ${categories}` : 'Quality products for animal health and wellness.'}`,
        type: 'website',
        images: data.image
          ? [
              {
                url: data.image.url,
                alt: data.image.alt || `${data.companyName} logo`,
                width: 1200,
                height: 630,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.companyName} | Animal Wellness`,
        description: `${productCount} products available${categories ? ` in ${categories}` : ''}`,
        images: data.image?.url ? [data.image.url] : [],
      },
      keywords: [
        data.companyName,
        'animal wellness',
        'veterinary products',
        'animal health',
        ...categories.split(', '),
      ].filter(Boolean),
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Company Profile | Animal Wellness',
      description: 'View our partner companies and their products at Animal Wellness.',
    }
  }
}

export default function Page() {
  return <CompanyDetailClient />
}