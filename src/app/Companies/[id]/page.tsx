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
        `${data.companyName} products`,
        `${data.companyName} veterinary`,
        data.address,
        ...data.products.map((p: { productName: string }) => p.productName),
        ...[...new Set(data.products.map((p: { category: string }) => p.category))],
        'animal wellness',
        'veterinary products',
        'animal health company',
        'veterinary manufacturer',
      ].filter(Boolean),
      alternates: {
        canonical: `https://www.animalwellness.shop/Companies/${id}`,
      },
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return {
      title: 'Company Profile | Animal Wellness',
      description: 'View our partner companies and their products at Animal Wellness.',
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
    const res = await fetch(`${getApiUrl()}/api/company/${id}`, {
      next: { revalidate: 1800 },
    })
    if (res.ok) {
      const data: Company = await res.json()
      const categories = [...new Set(data.products.map((p) => p.category))]
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: data.companyName,
        url: `https://www.animalwellness.shop/Companies/${id}`,
        email: data.email || undefined,
        telephone: data.mobileNumber || undefined,
        address: data.address
          ? {
              '@type': 'PostalAddress',
              streetAddress: data.address,
              addressCountry: 'PK',
            }
          : undefined,
        logo: data.image?.url
          ? { '@type': 'ImageObject', url: data.image.url }
          : undefined,
        description: `${data.companyName} — veterinary product manufacturer with ${data.products.length} products across ${categories.join(', ')}.`,
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
      <CompanyDetailClient />
    </>
  )
}