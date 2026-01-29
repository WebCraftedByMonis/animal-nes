'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
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
import { Building2, Mail, Phone, MapPin, Package, Search } from 'lucide-react'
import WhatsAppLink from '@/components/WhatsAppLink'

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

interface CompaniesClientProps {
  initialCompanies: Company[]
  initialTotal: number
}

export default function CompaniesClient({ initialCompanies, initialTotal }: CompaniesClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState<'id' | 'companyName'>((searchParams.get('sortBy') as 'id' | 'companyName') || 'id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc')
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 8)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(initialTotal)

  // Update URL when filters change
  const updateURL = useCallback((params: {
    search?: string
    sortBy?: string
    sortOrder?: string
    page?: number
    limit?: number
  }) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))

    if (params.search !== undefined) {
      if (params.search) {
        current.set('search', params.search)
      } else {
        current.delete('search')
      }
    }

    if (params.sortBy) current.set('sortBy', params.sortBy)
    if (params.sortOrder) current.set('sortOrder', params.sortOrder)
    if (params.page) current.set('page', params.page.toString())
    if (params.limit) current.set('limit', params.limit.toString())

    const search = current.toString()
    const query = search ? `?${search}` : ''

    router.push(`${pathname}${query}`)
  }, [pathname, router, searchParams])

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
    // Fetch on mount if no initial data, or when filters change
    if (initialCompanies.length === 0 || search || page > 1 || limit !== 8 || sortBy !== 'id' || sortOrder !== 'asc') {
      fetchCompanies()
    }
  }, [search, sortBy, sortOrder, page, limit, fetchCompanies, initialCompanies.length])

  const handleSearch = () => {
    setSearch(searchTerm)
    setPage(1)
    updateURL({ search: searchTerm, page: 1 })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-')
    setSortBy(newSortBy as 'id' | 'companyName')
    setSortOrder(newSortOrder as 'asc' | 'desc')
    updateURL({ sortBy: newSortBy, sortOrder: newSortOrder })
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
    updateURL({ limit: newLimit, page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    updateURL({ page: newPage })
  }

  const navigateToCompany = (company: Company) => {
    router.push(`/Companies/${company.id}`)
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-green-500">Our Partner Companies</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
       <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
          <div className="flex gap-1">
            <Input
              placeholder="Search companies..."
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
          <Select value={String(limit)} onValueChange={(v) => handleLimitChange(Number(v))}>
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
                <div className="bg-white dark:bg-zinc-900 aspect-square w-full rounded-md overflow-hidden mb-3">
                  {company.image ? (
                    <Image
                      src={company.image.url}
                      alt={company.image.alt || company.companyName}
                      width={300}
                      height={300}
                      className="w-full h-full object-contain p-4"
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
                        <WhatsAppLink phone={company.mobileNumber} showIcon={false} />
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
                onClick={() => handlePageChange(page - 1)}
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
                    onClick={() => handlePageChange(pageNum)}
                    className={pageNum === page ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                disabled={page * limit >= total}
                onClick={() => handlePageChange(page + 1)}
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