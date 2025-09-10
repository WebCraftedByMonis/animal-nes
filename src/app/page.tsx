

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

export default async function Home() {
  // Fetch initial testimonials on the server for ISR
  const initialTestimonials = await getInitialTestimonials()

  // Organization structured data
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Animal Wellness",
    description: "Complete veterinary solutions and pet care products marketplace",
    url: "https://www.animalwellness.shop",
    logo: "https://www.animalwellness.shop/logo.jpg",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "English"
    },
    sameAs: [
      "https://www.animalwellness.shop"
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
    url: "https://www.animalwellness.shop",
    description: "Your trusted partner for comprehensive animal wellness solutions",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.animalwellness.shop/products?search={search_term_string}",
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
      <LandingPage initialTestimonials={initialTestimonials} />
    </div>
  );
}
