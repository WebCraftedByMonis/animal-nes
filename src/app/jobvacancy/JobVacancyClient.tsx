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
import { MapPin, Calendar, Users, Search } from 'lucide-react';
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

interface JobVacancyClientProps {
  initialJobForms: JobForm[];
  initialTotal: number;
}

export default function JobVacancyClient({ initialJobForms, initialTotal }: JobVacancyClientProps) {
  const [jobForms, setJobForms] = useState<JobForm[]>(initialJobForms);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(12);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);

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

  // Handle search and filter changes
  useEffect(() => {
    if (search || page > 1 || limit !== 12) {
      fetchJobForms();
    }
  }, [search, page, limit, fetchJobForms]);

  const handleSearch = () => {
    setSearch(searchTerm);
    setPage(1); // Reset to first page when searching
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSearchTerm('');
    setPage(1);
    setLimit(12);
    setJobForms(initialJobForms);
    setTotal(initialTotal);
  };

  if (loading && jobForms.length === 0) {
    return (
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-green-500">Job Openings</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-green-500">Job Openings</h1>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-1">
          <Input
            placeholder="Search positions or companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="max-w-md"
          />
          <Button
            onClick={handleSearch}
            size="sm"
            className="bg-green-500 hover:bg-green-600 px-3"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[12, 24, 36, 48].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(search || page > 1 || limit !== 12) && (
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          Found {total} job{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Job Cards Grid */}
      {jobForms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No job openings found</p>
          <p className="text-gray-500 dark:text-gray-500">Try adjusting your search criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {jobForms.map((job) => (
              <div
                onClick={() => router.push(`/jobvacancy/${job.id}`)}
                key={job.id}
                className="group bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* Image Section */}
                <div className="aspect-[16/9] w-full relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900">
                  {job.jobFormImage?.url ? (
                    <Image
                      src={job.jobFormImage.url}
                      alt={job.position}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {job.company.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {job.position}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {job.company}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{job.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{job.noofpositions} positions</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>Apply by {new Date(job.deadline).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {Math.ceil(total / limit)}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
                className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
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
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="p-4 space-y-3">
        <div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}