import { notFound } from 'next/navigation'
import FormSubmissionClient from './FormSubmissionClient'
import { prisma } from '@/lib/prisma'

// Use ISR with hourly revalidation for better SEO
export const revalidate = 3600

// Generate static params (empty for on-demand ISR)
export async function generateStaticParams() {
  return []
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params

    const form = await prisma.dynamicForm.findUnique({
      where: { slug, isActive: true },
      select: {
        title: true,
        description: true,
        thumbnailUrl: true,
        paymentRequired: true,
        paymentAmount: true,
      }
    })

    if (!form) {
      return {
        title: 'Form Not Found | Animal Wellness',
        description: 'The requested form could not be found.',
      }
    }

    return {
      title: `${form.title} | Animal Wellness Forms`,
      description: form.description || `Submit ${form.title} - Secure online form submission for animal wellness services.`,
      keywords: [
        form.title,
        'veterinary forms',
        'animal registration',
        'pet care forms',
        'animal wellness applications',
        'online form submission'
      ].filter(Boolean),
      openGraph: {
        title: `${form.title} - Submit Online`,
        description: form.description || `Submit ${form.title} - Animal Wellness Services`,
        images: form.thumbnailUrl ? [{
          url: form.thumbnailUrl,
          width: 800,
          height: 600,
          alt: form.title
        }] : [],
        type: 'website',
        siteName: 'Animal Wellness',
      },
      alternates: {
        canonical: `/forms/${slug}`,
      },
    }
  } catch (error) {
    return {
      title: 'Form | Animal Wellness',
      description: 'Animal wellness form submission',
    }
  }
}

export default async function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Fetch form data on the server for ISR
  const form = await prisma.dynamicForm.findUnique({
    where: { slug, isActive: true },
    include: {
      fields: {
        orderBy: { orderIndex: 'asc' }
      }
    }
  })

  if (!form) {
    return notFound()
  }

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "WebPage",
    "name": form.title,
    "description": form.description || form.title,
    "url": `/forms/${slug}`,
    ...(form.thumbnailUrl && {
      "image": form.thumbnailUrl
    }),
    "provider": {
      "@type": "Organization",
      "name": "Animal Wellness"
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FormSubmissionClient initialForm={form} />
    </>
  )
}
