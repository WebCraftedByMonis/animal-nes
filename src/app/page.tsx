

import LandingPage from "@/components/LandingPage";
import { prisma } from '@/lib/prisma'

// ISR Configuration - revalidate every 3600 seconds (1 hour)
export const revalidate = 3600

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

  return (
    <div className="">
      <LandingPage initialTestimonials={initialTestimonials} />
    </div>
  );
}
