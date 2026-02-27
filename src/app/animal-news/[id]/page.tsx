
import { Metadata } from "next";
import NewsDetailPage from "./NewsDetailPage";
import { getApiUrl } from "@/lib/utils";

type NewsItem = {
  id: string;
  title: string;
  description: string;
  image?: { url: string; alt: string } | null;
  pdf?: { url: string };
  createdAt?: string;
  author?: string;
  category?: string;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Await the params object first
  const { id } = await params;
  const res = await fetch(`${getApiUrl()}/api/animal-news/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      title: "News Article Not Found | Animal Wellness",
      description: "This news article could not be loaded.",
    };
  }

  const data: NewsItem = await res.json();

  return {
    title: `${data.title} | Animal Wellness`,
    description: data.description,
    keywords: [
      data.title,
      data.category,
      data.author,
      'animal news',
      'veterinary news',
      'animal wellness',
      'livestock news',
      'pet health news',
      'animal industry updates',
    ].filter(Boolean),
    openGraph: {
      title: data.title,
      description: data.description,
      url: `https://www.animalwellness.shop/animal-news/${id}`,
      images: data.image?.url
        ? [{ url: data.image.url, alt: data.image.alt || data.title }]
        : [],
    },
    alternates: {
      canonical: `https://www.animalwellness.shop/animal-news/${id}`,
    },
  };
}

export default async function NewsPage({ params }: PageProps) {
  const { id } = await params;
  let jsonLd = null

  try {
    const res = await fetch(`${getApiUrl()}/api/animal-news/${id}`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const data: NewsItem = await res.json()
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: data.title,
        description: data.description,
        url: `https://www.animalwellness.shop/animal-news/${id}`,
        datePublished: data.createdAt || undefined,
        author: data.author
          ? { '@type': 'Person', name: data.author }
          : { '@type': 'Organization', name: 'Animal Wellness' },
        publisher: {
          '@type': 'Organization',
          name: 'Animal Wellness',
          url: 'https://www.animalwellness.shop',
        },
        image: data.image?.url
          ? { '@type': 'ImageObject', url: data.image.url }
          : undefined,
        articleSection: data.category || 'Animal News',
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
      <NewsDetailPage id={id} />
    </>
  )
}
