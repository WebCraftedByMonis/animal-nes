"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Loader2, Download } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";

type NewsItem = {
  id: string;
  title: string;
  description: string;
  image?: { url: string; alt: string };
  pdf?: { url: string };
  createdAt?: string;
  author?: string;
  category?: string;
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
        <Loader2 className="h-12 w-12 animate-spin text-green-500" />
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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with title and metadata */}
        <div className="mb-8">
          {news.category && (
            <span className="inline-block px-3 py-1 mb-2 text-sm font-semibold text-green-600 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">
              {news.category}
            </span>
          )}
          <h1 className="text-4xl font-bold text-green-600 dark:text-green-500">
            {news.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
            {news.author && (
              <span>By {news.author}</span>
            )}
            {news.createdAt && (
              <span>
                Published on {new Date(news.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            )}
          </div>
        </div>

        {/* Image and content row */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          {news.image && (
            <div className="lg:w-1/2">
              <div className="relative w-full h-96 lg:h-[500px] rounded-xl overflow-hidden shadow-lg">
                <Image
                  src={news.image.url}
                  alt={news.image.alt}
                  fill
                  className="object-fit"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="lg:w-1/2">
            <div className="prose max-w-none dark:prose-invert">
              <h2 className="text-2xl font-semibold text-green-600 dark:text-green-500 mb-6">
                {news.title} Details
              </h2>
              
              {news.description.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {news.pdf && (
              <div className="mt-8">
                <Button asChild className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
                  <a
                    href={news.pdf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download Full Article PDF
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

      
      </div>
    </div>
  );
}