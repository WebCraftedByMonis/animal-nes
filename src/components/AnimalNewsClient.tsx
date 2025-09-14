"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type NewsItem = {
  id: number;
  title: string;
  description: string;
  image?: { url: string; alt: string };
  pdf?: { url: string };
};

interface AnimalNewsClientProps {
  initialNews: NewsItem[];
  initialTotal: number;
}

export default function AnimalNewsClient({ 
  initialNews, 
  initialTotal 
}: AnimalNewsClientProps) {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fetchNews = useCallback(async () => {
    if (search === "" && page === 1) {
      setNews(initialNews);
      setTotal(initialTotal);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.get("/api/animal-news", {
        params: { search, page, limit },
      });
      setNews(data.data);
      setTotal(data.total);
    } catch (err) {
      toast.error("Failed to fetch news");
    } finally {
      setIsLoading(false);
    }
  }, [search, page, limit, initialNews, initialTotal]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleSearch = () => {
    setSearch(searchTerm);
    setPage(1); // Reset to first page when searching
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-green-600">Animal News</h1>
        <div className="flex gap-1">
          <Input
            placeholder="Search news..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-64"
          />
          <Button
            onClick={handleSearch}
            size="sm"
            className="bg-green-500 hover:bg-green-600 px-3"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item, i) => (
          <div
            key={item.id}
            onClick={() => router.push(`/animal-news/${item.id}`)}
            className="cursor-pointer bg-white shadow rounded-lg overflow-hidden border hover:shadow-md transition"
          >
            {item.image && (
              <Image
                src={item.image.url}
                alt={item.image.alt}
                width={400}
                height={600}
                className="w-full h-96 object-fit" 
              />
            )}

            <div className="p-4 space-y-2">
              <h2 className="text-xl font-semibold text-green-700">
                {(page - 1) * limit + i + 1}. {item.title}
              </h2>

              <p className="text-gray-600 line-clamp-3">{item.description}</p>

              {item.pdf && (
                <p className="text-blue-500 underline text-sm">PDF Attached</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-4">
          <Button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1 || isLoading}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-gray-700 pt-2">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages || isLoading}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}