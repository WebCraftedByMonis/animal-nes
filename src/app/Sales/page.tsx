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
import { Store, MapPin, Phone, Mail, Package, User2, Calendar } from 'lucide-react'

interface Partner {
  id: number
  partnerName: string
  gender?: string
  partnerEmail?: string
  partnerMobileNumber?: string
  cityName?: string
  state?: string
  fullAddress?: string
  shopName?: string
  qualificationDegree?: string
  rvmpNumber?: string
  specialization?: string
  species?: string
  partnerType?: string
  bloodGroup?: string
  zipcode?: string
  areaTown?: string
  availableDaysOfWeek: { day: string }[]
  partnerImage: { url: string; publicId: string } | null
  products: { id: number }[]
  createdAt: string
}

interface ApiResponse {
  data: Partner[]
  meta: {
    total: number
    page: number
    limit: number | 'all'
    totalPages: number
  }
}

export default function SalesPartnersPage() {
  const [allPartners, setAllPartners] = useState<Partner[]>([])
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(8)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const router = useRouter()

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get<ApiResponse>('/api/partner', {
        params: {
          sortBy,
          order,
          partnerTypeGroup: 'sales',
          _t: Date.now()
        },
      })
      setAllPartners(data.data)
    } catch (error) {
      console.error('Error fetching partners:', error)
      toast.error('Failed to fetch sales partners')
    } finally {
      setLoading(false)
    }
  }, [sortBy, order])

  // Initial Fetch (only once)
  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  // Local Search Filter
  useEffect(() => {
    let filtered = allPartners

    if (search.trim() !== '') {
      filtered = filtered.filter((partner) => {
        const searchLower = search.toLowerCase()
        return (
          partner.partnerName.toLowerCase().includes(searchLower) ||
          (partner.shopName && partner.shopName.toLowerCase().includes(searchLower)) ||
          (partner.cityName && partner.cityName.toLowerCase().includes(searchLower)) ||
          (partner.state && partner.state.toLowerCase().includes(searchLower))
        )
      })
    }

    // Apply Sorting
    filtered = filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Partner]
      const bValue = b[sortBy as keyof Partner]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (order === 'asc') return aValue.localeCompare(bValue)
        else return bValue.localeCompare(aValue)
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        if (order === 'asc') return aValue.getTime() - bValue.getTime()
        else return bValue.getTime() - aValue.getTime()
      }

      return 0
    })

    setFilteredPartners(filtered)

    const pages = Math.ceil(filtered.length / limit)
    setTotalPages(pages)
    setPage(1) // reset to page 1 on every search/filter change
  }, [search, allPartners, sortBy, order, limit])

  const handleSortChange = (value: string) => {
    const [newSortBy, newOrder] = value.split('-')
    setSortBy(newSortBy)
    setOrder(newOrder as 'asc' | 'desc')
  }

  const navigateToPartner = (partner: Partner) => {
    router.push(`/Sales/${partner.id}`)
  }

  const getDaysAbbreviation = (days: { day: string }[]) => {
    if (!days || days.length === 0) return 'Not specified'
    if (days.length === 7) return 'All week'
    return days.map(d => d.day.slice(0, 3)).join(', ')
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const maxButtons = 5

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i)
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          buttons.push(i)
        }
        buttons.push('...')
        buttons.push(totalPages)
      } else if (page >= totalPages - 2) {
        buttons.push(1)
        buttons.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          buttons.push(i)
        }
      } else {
        buttons.push(1)
        buttons.push('...')
        for (let i = page - 1; i <= page + 1; i++) {
          buttons.push(i)
        }
        buttons.push('...')
        buttons.push(totalPages)
      }
    }

    return buttons
  }

  const getPartnerSubcategory = (partnerType?: string) => {
    if (!partnerType) return null
    const match = partnerType.match(/\((.*?)\)/)
    if (match && match[1]) {
      const subcategories = match[1].split(',').map(s => s.trim())
      return subcategories[0]
    }
    return null
  }

  const paginatedPartners = filteredPartners.slice((page - 1) * limit, page * limit)

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-500">Our Sales & Marketing Partners</h1>
        <p className="text-gray-600 dark:text-gray-400">Connect with trusted retailers and distributors in your area</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search partners, City, Shopname"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:ring-green-500 max-w-md"
          />
          <Select
            value={`${sortBy}-${order}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="partnerName-asc">Name (A-Z)</SelectItem>
              <SelectItem value="partnerName-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
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
            <span className="text-sm">entries</span>
          </div>
        </div>

        {!loading && filteredPartners.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, filteredPartners.length)} of {filteredPartners.length} entries
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <PartnerCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {paginatedPartners.map((partner) => {
              const subcategory = getPartnerSubcategory(partner.partnerType)

              return (
                <div
                  key={partner.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigateToPartner(partner)}
                >
                  <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3 bg-gray-100 dark:bg-zinc-800">
                    {partner.partnerImage ? (
                      <Image
                        src={partner.partnerImage.url}
                        alt={partner.partnerName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <User2 className="h-20 w-20 text-gray-400 dark:text-zinc-600" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-lg line-clamp-1">{partner.partnerName}</h3>

                    {subcategory && (
                      <Badge variant="secondary" className="text-xs">
                        {subcategory}
                      </Badge>
                    )}

                    {partner.shopName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Store className="h-3 w-3 flex-shrink-0" />
                        <span className="line-clamp-1">{partner.shopName}</span>
                      </div>
                    )}

                    {partner.cityName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="line-clamp-1">{partner.cityName}{partner.state ? `, ${partner.state}` : ''}</span>
                      </div>
                    )}

                    {partner.partnerMobileNumber && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="line-clamp-1">{partner.partnerMobileNumber}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {getDaysAbbreviation(partner.availableDaysOfWeek)}
                      </Badge>
                      {partner.products.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {partner.products.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredPartners.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No sales partners found</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap justify-center items-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>

              {renderPaginationButtons().map((pageNum, index) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    onClick={() => handlePageChange(pageNum as number)}
                    className={pageNum === page ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {pageNum}
                  </Button>
                )
              ))}

              <Button
                variant="outline"
                disabled={page === totalPages}
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

function PartnerCardSkeleton() {
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
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  )
}