"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";

type NewsItem = {
  id: string;
  title: string;
  description: string;
  image?: { url: string; alt: string };
  pdf?: { url: string };
};

export default function NewsDetailPage() {
  const { id } = useParams();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNewsItem() {
      try {
        const { data } = await axios.get(`/api/animal-news/${id}`);
        setNews(data);
      } catch (err) {
        toast.error("Failed to load news item");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchNewsItem();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="text-center mt-10 text-red-500 font-semibold">
        News article not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-green-700 mb-4">{news.title}</h1>

      {news.image && (
        <div className="relative w-full h-96 mb-6">
          <Image
            src={news.image.url}
            alt={news.image.alt}
            fill
            className="object-fit rounded-lg shadow"
          />
        </div>
      )}
<h2 className="text-3xl font-semibold text-green-500">Description</h2>
      <p className="text-lg text-gray-700 leading-relaxed mb-6">
        {news.description}
      </p>

      {news.pdf && (
        <Button asChild variant="outline">
          <a
            href={news.pdf.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 font-medium"
          >
            View Attached PDF
          </a>
        </Button>
      )}
    </div>
  );
}
