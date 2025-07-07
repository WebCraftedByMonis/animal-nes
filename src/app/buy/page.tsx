'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';  // ✅ import router

interface SellAnimalRequest {
  id: number;
  specie: string;
  breed: string;
  totalPrice: number;
  images: { url: string; alt: string }[];
}

export default function AnimalMarketplace() {
  const router = useRouter();  // ✅ router hook

  const [requests, setRequests] = useState<SellAnimalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(8);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/sell-animal', {
        params: { 
          q: search, 
          limit, 
          page, 
          sort: 'createdAt', 
          order: 'desc'
        },
      });

      const simplified = data.items.map((item: any) => ({
        id: item.id,
        specie: item.specie,
        breed: item.breed,
        totalPrice: item.totalPrice,
        images: item.images,
      }));

      setRequests(simplified);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">Animals For Sale</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search animals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:ring-green-500 max-w-md"
          />

          <span>Show</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              {[8, 16, 24, 48].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>entries</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <AnimalCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {requests.map((animal) => (
              <div
                key={animal.id}
                className="bg-white dark:bg-zinc-900 rounded-lg shadow border p-4 space-y-3 hover:shadow-lg transition cursor-pointer"
                onClick={() => router.push(`/buy/${animal.id}`)} // ✅ navigate to detail page
              >
                {animal.images?.[0]?.url ? (
                  <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3">
                    <Image
                      src={animal.images[0].url}
                      alt={animal.images[0].alt || animal.specie}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full bg-gray-100 rounded-md flex items-center justify-center text-sm text-gray-500">
                    No Image
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-bold text-lg line-clamp-2">{animal.specie}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{animal.breed}</p>

                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      PKR {animal.totalPrice.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {requests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No animals found</p>
            </div>
          )}

          {total > limit && (
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnimalCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border p-4 space-y-3">
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}
