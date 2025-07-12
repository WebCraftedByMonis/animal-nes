import type { MetadataRoute } from 'next'

interface Product {
  id: number
  productName: string
  // other fields...
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all products
  const res = await fetch('https://animal-nes-lv3a.vercel.app/api/product')
  const { data }: { data: Product[] } = await res.json()

  const now = new Date()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://www.animalwellness.shop',
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://www.animalwellness.shop/products',
      lastModified: now,
    },
    {
      url: 'https://www.animalwellness.shop/buy',
      lastModified: now,
    },
    {
      url: 'https://www.animalwellness.shop/findDoctor',
      lastModified: now,
    },
    {
      url: 'https://www.animalwellness.shop/jobApplicantForm',
      lastModified: now,
    },
    {
      url: 'https://www.animalwellness.shop/animal-news',
      lastModified: now,
    },
    {
      url: 'https://www.animalwellness.shop/sell',
      lastModified: now,
    },
  ]

  // Dynamic product pages
  const productPages: MetadataRoute.Sitemap = data.map((product) => ({
    url: `https://www.animalwellness.shop/products/${product.id}`,
    lastModified: now,
  }))

  return [...staticPages, ...productPages]
}
