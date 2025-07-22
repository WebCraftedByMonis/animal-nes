'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import { FileDown, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface JobFormImage {
  id: string;
  url: string;
  alt: string;
  publicId: string;
}

interface JobForm {
  id: string;
  name: string;
  company: string;
  mobileNumber: string;
  email?: string;
  position: string;
  eligibility: string;
  benefits: string;
  location: string;
  deadline: string;
  noofpositions: string;
  companyAddress: string;
  howToApply: string;
  jobFormImage?: JobFormImage;
  createdAt: string;
}

export default function JobFormsCardsPage() {
  const [jobForms, setJobForms] = useState<JobForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(8);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const router = useRouter(); 

  const fetchJobForms = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search,
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      const { data } = await axios.get('/api/vacancyForm', { params });
      setJobForms(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch job forms');
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    fetchJobForms();
  }, [fetchJobForms]);

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-600">Job Listings</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
          {Array.from({ length: limit }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {jobForms.map((job) => (
              <div
              onClick={() => router.push(`/jobvacancy/${job.id}`)}
                key={job.id}
                className="bg-white dark:bg-zinc-900 rounded-lg shadow border p-4 space-y-3"
              >
                <div className="aspect-square w-full relative rounded overflow-hidden">
                  {job.jobFormImage?.url ? (
                    <Image
                      src={job.jobFormImage.url}
                      alt={job.jobFormImage.alt || job.position}
                      fill
                      className="object-fit"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                      No Image
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold line-clamp-2">{job.position}</h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {job.location}
                  </Badge>

                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>By: {job.name}</p>
                    <p>{job.mobileNumber}</p>
                    {job.email && <p>{job.email}</p>}
                    <p>Positions: {job.noofpositions}</p>
                    <p>Deadline: {job.deadline}</p>
                  </div>

                  <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400 mt-2">
                    <p><strong>Eligibility:</strong> {job.eligibility}</p>
                    <p><strong>Benefits:</strong> {job.benefits}</p>
                    <p><strong>How to Apply:</strong> {job.howToApply}</p>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Posted on {new Date(job.createdAt).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

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

function JobCardSkeleton() {
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
