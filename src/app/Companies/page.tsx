'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Mail, Phone, MapPin, Package } from 'lucide-react'

interface Company {
  id: number
  companyName: string
  mobileNumber: string | null
  address: string | null
  email: string | null
  image: { url: string; alt: string; publicId: string | null } | null
  products: { id: number }[]
  createdAt: string
}

export default function AllCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'companyName'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(8)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const router = useRouter()

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/company', {
        params: { 
          search, 
          sortBy, 
          sortOrder, 
          page, 
          limit
        },
      })
      setCompanies(data.data)
      setTotal(data.total)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-')
    setSortBy(sortBy as 'id' | 'companyName')
    setSortOrder(sortOrder as 'asc' | 'desc')
  }

  const navigateToCompany = (company: Company) => {
    // Navigate to company detail page
    router.push(`/Companies/${company.id}`)
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-green-500">Our Partner Companies</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
       <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:ring-green-500 max-w-md"
          />
          <Select 
            value={`${sortBy}-${sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id-asc">ID (Ascending)</SelectItem>
              <SelectItem value="id-desc">ID (Descending)</SelectItem>
              <SelectItem value="companyName-asc">Name (A-Z)</SelectItem>
              <SelectItem value="companyName-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <span>Show</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              {[8, 16, 32, 64].map((n) => (
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
            <CompanyCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {companies.map((company) => (
              <div 
                key={company.id} 
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigateToCompany(company)}
              >
                <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3 bg-gray-100 dark:bg-zinc-800">
                  {company.image ? (
                    <Image
                      src={company.image.url}
                      alt={company.image.alt || company.companyName}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Building2 className="h-20 w-20 text-gray-400 dark:text-zinc-600" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg line-clamp-2">{company.companyName}</h3>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {company.email && (
                      <div className="flex items-center gap-2 line-clamp-1">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                    
                    {company.mobileNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>{company.mobileNumber}</span>
                      </div>
                    )}
                    
                    {company.address && (
                      <div className="flex items-center gap-2 line-clamp-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{company.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Package className="h-3 w-3 mr-1" />
                      {company.products.length} Products
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {companies.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No companies found</p>
            </div>
          )}

          {total > limit && (
            <div className="mt-6 flex justify-center gap-2">
              <Button 
                variant="outline" 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, Math.ceil(total / limit)) }, (_, i) => {
                let pageNum
                if (Math.ceil(total / limit) <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= Math.ceil(total / limit) - 2) {
                  pageNum = Math.ceil(total / limit) - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    onClick={() => setPage(pageNum)}
                    className={pageNum === page ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {pageNum}
                  </Button>
                )
              })}
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
  )
}

function CompanyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </div>
  )
}