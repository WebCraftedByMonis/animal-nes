
import { Metadata } from "next";
import NewsDetailPage from "./NewsDetailPage";

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
  params: { id: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const res = await fetch(`https://animal-nes-lv3a.vercel.app/api/animal-news/${params.id}`, {
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
    openGraph: {
      images: data.image?.url
        ? [{ url: data.image.url, alt: data.image.alt || data.title }]
        : [],
    },
  };
}

export default function NewsPage({ params }: PageProps) {
  return <NewsDetailPage id={params.id} />;
}
