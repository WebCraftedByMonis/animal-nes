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

export default function VeterinaryPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'partnerName'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(8)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const router = useRouter()

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/partner', {
        params: { 
          search, 
          sortBy, 
          sortOrder, 
          page, 
          limit,
          partnerType: 'veterinary' // Filter for veterinary partners
        },
      })
      
      // Filter for veterinary partners (in case backend doesn't support partnerType filter)
      const veterinaryPartners = data.data.filter((partner: Partner) => 
        partner.partnerType?.toLowerCase() === 'veterinary' || 
        partner.partnerType?.toLowerCase() === 'vet' ||
        partner.partnerType?.toLowerCase() === 'veterinarian' ||
        partner.specialization || // If they have specialization, likely a vet
        partner.qualificationDegree // If they have qualification, likely a vet
      )
      
      setPartners(veterinaryPartners)
      setTotal(veterinaryPartners.length)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch veterinary partners')
    } finally {
      setLoading(false)
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-')
    setSortBy(sortBy as 'id' | 'partnerName')
    setSortOrder(sortOrder as 'asc' | 'desc')
  }

  const navigateToPartner = (partner: Partner) => {
    router.push(`/Veternarians/${partner.id}`)
  }

  const getDaysAbbreviation = (days: { day: string }[]) => {
    if (!days || days.length === 0) return 'Not specified'
    if (days.length === 7) return 'All week'
    return days.map(d => d.day.slice(0, 3)).join(', ')
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-500">Our Veterinary Partners</h1>
        <p className="text-gray-600 dark:text-gray-400">Connect with qualified veterinary professionals in your area</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search veterinarians..."
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
              <SelectItem value="partnerName-asc">Name (A-Z)</SelectItem>
              <SelectItem value="partnerName-desc">Name (Z-A)</SelectItem>
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
            <PartnerCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {partners.map((partner) => (
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
            ))}
          </div>

          {partners.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No veterinary partners found</p>
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