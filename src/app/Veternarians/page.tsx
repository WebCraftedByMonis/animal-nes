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
import { Stethoscope, MapPin, GraduationCap, Calendar, Package, User2 } from 'lucide-react'

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
    filters?: {
      partnerTypeGroup?: string
      partnerType?: string
      search?: string
      specialization?: string
      species?: string
    }
  }
}

export default function VeterinaryPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(8)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const router = useRouter()

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get<ApiResponse>('/api/partner', {
        params: { 
          search, 
          sortBy, 
          order, 
          page, 
          limit,
          partnerTypeGroup: 'veterinarian' // This will filter for "Veterinarian (Clinic, Hospital, Consultant)"
        },
      })
      
      setPartners(data.data)
      setTotal(data.meta.total)
      setTotalPages(data.meta.totalPages)
    } catch (error) {
      console.error('Error fetching partners:', error)
      toast.error('Failed to fetch veterinary partners')
    } finally {
      setLoading(false)
    }
  }, [search, sortBy, order, page, limit])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  // Reset to page 1 when limit changes
  useEffect(() => {
    setPage(1)
  }, [limit])

  const handleSortChange = (value: string) => {
    const [newSortBy, newOrder] = value.split('-')
    setSortBy(newSortBy)
    setOrder(newOrder as 'asc' | 'desc')
    setPage(1) // Reset to first page when sorting changes
  }

  const navigateToPartner = (partner: Partner) => {
    router.push(`/Veternarians/${partner.id}`)
  }

  const getDaysAbbreviation = (days: { day: string }[]) => {
    if (!days || days.length === 0) return 'Not specified'
    if (days.length === 7) return 'All week'
    return days.map(d => d.day.slice(0, 3)).join(', ')
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const maxButtons = 5
    
    if (totalPages <= maxButtons) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i)
      }
    } else {
      // Complex pagination logic
      if (page <= 3) {
        // Near the beginning
        for (let i = 1; i <= 4; i++) {
          buttons.push(i)
        }
        buttons.push('...')
        buttons.push(totalPages)
      } else if (page >= totalPages - 2) {
        // Near the end
        buttons.push(1)
        buttons.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          buttons.push(i)
        }
      } else {
        // In the middle
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

  // Extract the subcategory from partnerType for display
  const getPartnerSubcategory = (partnerType?: string) => {
    if (!partnerType) return null
    const match = partnerType.match(/\((.*?)\)/)
    if (match && match[1]) {
      const subcategories = match[1].split(',').map(s => s.trim())
      // Return the first subcategory, or you can return all
      return subcategories[0]
    }
    return null
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-500">Our Veterinary Partners</h1>
        <p className="text-gray-600 dark:text-gray-400">Connect with qualified veterinary professionals in your area</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search veterinarians..."
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
        
        {/* Show current page info */}
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
              )
            })}
          </div>

          {partners.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No veterinary partners found</p>
            </div>
          )}

          {/* Pagination */}
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