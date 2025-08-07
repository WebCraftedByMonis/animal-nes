"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation"; // ✅ Import router
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type NewsItem = {
  id: string;
  title: string;
  description: string;
  image?: { url: string; alt: string };
  pdf?: { url: string };
};

export default function NewsListPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const router = useRouter(); // ✅ Get router instance

  const fetchNews = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/animal-news", {
        params: { search, page, limit },
      });
      setNews(data.data);
      setTotal(data.total);
    } catch (err) {
      toast.error("Failed to fetch news");
    }
  }, [search, page, limit]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-green-600">Animal News</h1>
        <Input
          placeholder="Search news..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item, i) => (
          <div
            key={item.id}
            onClick={() => router.push(`/animal-news/${item.id}`)} // ✅ Navigate on click
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

      {/* Pagination Controls */}
      <div className="flex justify-center mt-8 gap-4">
        <Button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
          variant="outline"
        >
          Previous
        </Button>
        <span className="text-gray-700 pt-2">
          Page {page} of {totalPages}
        </span>
        <Button
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
