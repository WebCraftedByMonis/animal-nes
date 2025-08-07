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
import { Pencil, Trash2, Loader2, FileDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function ApplicantCardsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(8);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);


  const router = useRouter();
  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/jobApplicant', {
        params: { search, page, limit, declaration: 'AGREED' }, // ✅ This filters the data
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

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

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

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-600">Job Applicants</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search applicants..."
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
            <ApplicantCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {applicants.map((app) => (
              <div
                onClick={() => router.push(`/Applicants/${app.id}`)}
                key={app.id} className="bg-white dark:bg-zinc-900 rounded-lg shadow border p-4 space-y-3">
                <div className="aspect-square w-full relative rounded overflow-hidden">
                  {app.image?.url ? (
                    <Image
                      src={app.image.url}
                      alt={app.image.alt || app.name}
                      fill
                      className="object-cover"
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
                    <p>{app.mobileNumber}</p>
                    <p>{app.address}</p>
                    <p>{new Date(app.dateOfBirth).toLocaleDateString()}</p>
                    <p>{app.expectedSalary ? `Expected: ${app.expectedSalary}` : '-'}</p>
                  </div>

                  {app.cv && (
                    <a
                      href={app.cv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                    >
                      <FileDown className="w-4 h-4" /> View CV
                    </a>
                  )}


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
