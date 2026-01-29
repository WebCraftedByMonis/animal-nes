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
import { Pencil, Trash2, Loader2, FileDown, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import WhatsAppLink from '@/components/WhatsAppLink';

interface Applicant {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  mobileNumber: string;
  address: string;
  qualification?: string;
  dateOfBirth: string;
  expectedPosition?: string;
  expectedSalary?: string;
  preferredIndustry?: string;
  preferredLocation?: string;
  highestDegree?: string;
  degreeInstitution?: string;
  majorFieldOfStudy?: string;
  workExperience?: string;
  previousCompany?: string;
  declaration: 'AGREED' | 'NOT_AGREED';
  image?: { url: string; alt: string } | null;
  cv?: { url: string; alt: string } | null;
}

interface ApplicantsClientProps {
  initialApplicants: Applicant[];
  initialTotal: number;
}

export default function ApplicantsClient({ initialApplicants, initialTotal }: ApplicantsClientProps) {
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(8);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const router = useRouter();

  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/jobApplicant', {
        params: { search, page, limit, declaration: 'AGREED' },
      });
      setApplicants(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch applicants');
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  // Handle search and filter changes
  useEffect(() => {
    if (search || page > 1 || limit !== 8) {
      fetchApplicants();
    }
  }, [search, page, limit, fetchApplicants]);

  const handleSearch = () => {
    setSearch(searchTerm);
    setPage(1); // Reset to first page when searching
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(id);
    try {
      await axios.delete('/api/jobApplicant', { params: { id } });
      toast.success('Applicant deleted');
      fetchApplicants();
    } catch {
      toast.error('Failed to delete applicant');
    } finally {
      setIsDeleting(null);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSearchTerm('');
    setPage(1);
    setLimit(8);
    setApplicants(initialApplicants);
    setTotal(initialTotal);
  };

  if (loading && applicants.length === 0) {
    return (
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-green-600">Job Applicants</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <ApplicantCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-600">Job Applicants</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            <Input
              placeholder="Search applicants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="focus:ring-green-500 max-w-md"
            />
            <Button
              onClick={handleSearch}
              size="sm"
              className="bg-green-500 hover:bg-green-600 px-3"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
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
        
        {(search || page > 1 || limit !== 8) && (
          <Button variant="outline" onClick={resetFilters}>
            Reset Filters
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          Found {total} applicant{total !== 1 ? 's' : ''}
        </p>
      </div>

      {applicants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No applicants found</p>
          <p className="text-gray-500 dark:text-gray-500">Try adjusting your search criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {applicants.map((app) => (
              <div
                onClick={() => router.push(`/Applicants/${app.id}`)}
                key={app.id} 
                className="bg-white dark:bg-zinc-900 rounded-lg shadow border p-4 space-y-3 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square w-full relative rounded overflow-hidden">
                  {app.image?.url ? (
                    <Image
                      src={app.image.url}
                      alt={app.image.alt || app.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                      No Image
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold line-clamp-2">{app.name}</h3>
                  <p className="text-sm text-muted-foreground">{app.expectedPosition || 'N/A'}</p>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {app.gender}
                  </Badge>

                  <div className="text-sm text-gray-500">
                    <WhatsAppLink phone={app.mobileNumber || ''} />
                    <p>{app.address}</p>
                    <p>{new Date(app.dateOfBirth).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit' 
                    })}</p>
                    <p>{app.expectedSalary ? `Expected: ${app.expectedSalary}` : '-'}</p>
                  </div>

                  {app.cv && (
                    <a
                      href={app.cv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                      onClick={(e) => e.stopPropagation()} // Prevent card click when clicking CV link
                    >
                      <FileDown className="w-4 h-4" /> View CV
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {applicants.length > 0 && (
            <div className="flex justify-center items-center space-x-2 pt-6">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(5, Math.ceil(total / limit)))].map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      onClick={() => setPage(pageNum)}
                      className={page === pageNum 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / limit)}
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

function ApplicantCardSkeleton() {
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