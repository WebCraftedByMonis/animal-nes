

import LandingPage from "@/components/LandingPage";
import { prisma } from '@/lib/prisma'

// ISR Configuration - revalidate every 1800 seconds (30 minutes)
export const revalidate = 1800

// Generate static params for initial ISR generation
export async function generateStaticParams() {
  // Return empty array to generate on-demand
  return []
}

// Server-side data fetching for ISR
async function getInitialTestimonials() {
  try {
    const limit = 3
    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where: {
          isApproved: true,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.testimonial.count({
        where: {
          isApproved: true,
          isActive: true,
        },
      })
    ])

    return {
      data: testimonials.map(testimonial => ({
        ...testimonial,
        createdAt: testimonial.createdAt.toISOString()
      })),
      pagination: {
        hasMore: total > limit,
        total,
        page: 1,
        limit
      }
    }
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    return {
      data: [],
      pagination: {
        hasMore: false,
        total: 0,
        page: 1,
        limit: 3
      }
    }
  }
}

// Real "Trending Now" — ordered by the ranking engine's score (see
// src/lib/ranking.ts / compute-rankings.js). Replaces the old hardcoded
// bestSellers array that never reflected the actual catalog.
async function getTrendingProducts() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, approvalStatus: 'APPROVED' },
      orderBy: [{ isFeatured: 'desc' }, { rankingScore: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      include: {
        image: true,
        company: { select: { companyName: true } },
        variants: { select: { customerPrice: true }, take: 1 },
      },
    })
    return products.map((p) => ({
      id: p.id,
      productName: p.productName,
      category: p.category,
      image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
      price: p.variants[0]?.customerPrice ?? null,
      companyName: p.company?.companyName ?? null,
    }))
  } catch (error) {
    console.error('Error fetching trending products:', error)
    return []
  }
}

async function getNewArrivals() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, approvalStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        image: true,
        company: { select: { companyName: true } },
        variants: { select: { customerPrice: true }, take: 1 },
      },
    })
    return products.map((p) => ({
      id: p.id,
      productName: p.productName,
      category: p.category,
      image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
      price: p.variants[0]?.customerPrice ?? null,
      companyName: p.company?.companyName ?? null,
    }))
  } catch (error) {
    console.error('Error fetching new arrivals:', error)
    return []
  }
}

// Companies approved/added in the last 30 days with at least one live
// product — gives new vendors real homepage exposure instead of only a
// score boost nobody sees (same fairness idea as the ranking engine's
// new-vendor boost).
async function getNewVendors() {
  try {
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const companies = await prisma.company.findMany({
      where: {
        createdAt: { gte: since },
        products: { some: { isActive: true, approvalStatus: 'APPROVED' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        image: true,
        _count: { select: { products: { where: { isActive: true, approvalStatus: 'APPROVED' } } } },
      },
    })

    return companies.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      image: c.image ? { url: c.image.url } : null,
      country: c.country,
      productCount: c._count.products,
    }))
  } catch (error) {
    console.error('Error fetching new vendors:', error)
    return []
  }
}

export default async function Home() {
  // Fetch initial testimonials and homepage product sections on the server for ISR
  const [initialTestimonials, trendingProducts, newArrivals, newVendors] = await Promise.all([
    getInitialTestimonials(),
    getTrendingProducts(),
    getNewArrivals(),
    getNewVendors(),
  ])

  // Organization structured data
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Animal Wellness",
    description: "Complete veterinary solutions and pet care products marketplace",
    url: "https://animalwellness.shop",
    logo: "https://animalwellness.shop/logo.jpg",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "English"
    },
    sameAs: [
      "https://animalwellness.shop"
    ],
    serviceArea: {
      "@type": "Country",
      name: "Pakistan"
    }
  };

  // Website structured data
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Animal Wellness",
    url: "https://animalwellness.shop",
    description: "Your trusted partner for comprehensive animal wellness solutions",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://animalwellness.shop/products?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <div className="">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
      />
      <LandingPage
        initialTestimonials={initialTestimonials}
        trendingProducts={trendingProducts}
        newArrivals={newArrivals}
        newVendors={newVendors}
      />
    </div>
  );
}
