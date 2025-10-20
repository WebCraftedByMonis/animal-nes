'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import Link from 'next/link'
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
import { Stethoscope, MapPin, GraduationCap, Calendar, Package, User2, Search } from 'lucide-react'

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

export default function VeterinariansClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [partners, setPartners] = useState<Partner[]>([])
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt')
  const [order, setOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc')
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 8)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Update URL params when filters change
  const updateURL = useCallback((newPage: number, newSearch: string, newSortBy: string, newOrder: string, newLimit: number) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', String(newPage))
    if (newSearch) params.set('search', newSearch)
    if (newSortBy !== 'createdAt') params.set('sortBy', newSortBy)
    if (newOrder !== 'desc') params.set('order', newOrder)
    if (newLimit !== 8) params.set('limit', String(newLimit))

    const queryString = params.toString()
    router.push(queryString ? `/Veternarians?${queryString}` : '/Veternarians', { scroll: false })
  }, [router])

  const fetchPartners = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/partner', {
        params: {
          search: search || undefined,
          sortBy,
          order,
          partnerTypeGroup: 'veterinarian',
          page,
          limit
        }
      })

      setPartners(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch (error) {
      console.error('Error fetching partners:', error)
      toast.error('Failed to fetch veterinary partners')
      setPartners([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, order])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    updateURL(newPage, search, sortBy, order, limit)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
    updateURL(1, searchInput, sortBy, order, limit)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSortChange = (value: string) => {
    const [newSortBy, newOrder] = value.split('-')
    setSortBy(newSortBy)
    setOrder(newOrder as 'asc' | 'desc')
    setPage(1)
    updateURL(1, search, newSortBy, newOrder, limit)
  }

  const handleLimitChange = (value: string) => {
    const newLimit = Number(value)
    setLimit(newLimit)
    setPage(1)
    updateURL(1, search, sortBy, order, newLimit)
  }

  const getDaysAbbreviation = (days: { day: string }[]) => {
    if (!days || days.length === 0) return 'Not specified'
    if (days.length === 7) return 'All week'
    return days.map(d => d.day.slice(0, 3)).join(', ')
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

  const totalPages = Math.ceil(total / limit)

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

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-500">Our Veterinary Partners</h1>
        <p className="text-gray-600 dark:text-gray-400">Connect with qualified veterinary professionals in your area</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1">
            <Input
              placeholder="Search veterinarians, City, Shopname"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
            <Select value={String(limit)} onValueChange={handleLimitChange}>
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

        {!loading && total > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
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
            {partners.map((partner) => {
              const subcategory = getPartnerSubcategory(partner.partnerType)

              return (
                <Link key={partner.id} href={`/Veternarians/${partner.id}`}>
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="bg-white dark:bg-zinc-900 aspect-square w-full rounded-md overflow-hidden mb-3">
                      {partner.partnerImage ? (
                        <Image
                          src={partner.partnerImage.url}
                          alt={partner.partnerName}
                          width={300}
                          height={300}
                          className="w-full h-full object-contain"
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

                      {partner.specialization && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Stethoscope className="h-3 w-3 flex-shrink-0" />
                          <span className="line-clamp-1">{partner.specialization}</span>
                        </div>
                      )}

                      {partner.qualificationDegree && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <GraduationCap className="h-3 w-3 flex-shrink-0" />
                          <span className="line-clamp-1">{partner.qualificationDegree}</span>
                        </div>
                      )}

                      {partner.cityName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="line-clamp-1">{partner.cityName}{partner.state ? `, ${partner.state}` : ''}</span>
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
                </Link>
              )
            })}
          </div>

          {partners.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No veterinary partners found</p>
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