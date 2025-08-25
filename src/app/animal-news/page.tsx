import { prisma } from '@/lib/prisma'
import AnimalNewsClient from '@/components/AnimalNewsClient'

interface NewsItem {
  id: number;
  title: string;
  description: string;
  image?: { url: string; alt: string };
  pdf?: { url: string };
}

// ISR Configuration - revalidate every 60 seconds
export const revalidate = 60

// Generate static params for initial ISR generation (optional)
export async function generateStaticParams() {
  return []
}

// Server Component with ISR
async function getInitialNews(): Promise<{
  news: NewsItem[]
  total: number
}> {
  const limit = 10
  const page = 1
  const skip = (page - 1) * limit

  try {
    const [data, total] = await Promise.all([
      prisma.animalNews.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          image: true,
          pdf: true,
        },
      }),
      prisma.animalNews.count(),
    ])

    return {
      news: data as NewsItem[],
      total,
    }
  } catch (error) {
    console.error('Error fetching initial news:', error)
    return {
      news: [],
      total: 0,
    }
  }
}

export default async function AnimalNewsPage() {
  const { news, total } = await getInitialNews()

  return (
    <AnimalNewsClient 
      initialNews={news}
      initialTotal={total}
    />
  )
}
