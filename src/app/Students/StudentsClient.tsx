'use client'

import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User2, Mail, Phone, MapPin, Calendar, 
  GraduationCap, BookOpen, Award, Building2,
  Search, ExternalLink, Filter, Users
} from 'lucide-react'

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
  availableDaysOfWeek: { day: string }[]
  partnerImage: { url: string; publicId: string } | null
  products: { id: number }[]
  createdAt: string
}

interface StudentsClientProps {
  initialPartners: Partner[]
}

export default function StudentsClient({ initialPartners }: StudentsClientProps) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners)
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(12) // Show 12 cards per page
  const [total, setTotal] = useState(initialPartners.length)

  const fetchPartners = useCallback(async (searchTerm = search, spec = specialization) => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/partner', {
        params: { 
          search: searchTerm, 
          specialization: spec === 'all' ? '' : spec,
          partnerTypeGroup: 'student',
          page, 
          limit 
        }
      })
      
      setPartners(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch (error) {
      console.error('Fetch students error:', error)
      toast.error('Failed to fetch students')
      setPartners([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  // Handle page changes - maintain current search/filter
  useEffect(() => {
    if (page > 1) {
      fetchPartners(search, specialization)
    }
  }, [page])

  const resetFilters = () => {
    setSearch('')
    setSpecialization('all')
    setPage(1)
    // Reset to initial data
    setPartners(initialPartners)
    setTotal(initialPartners.length)
  }

  const handleSearch = () => {
    setPage(1)
    fetchPartners(search, specialization)
  }

  if (isLoading && partners.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Students
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Connect with students specializing in veterinary sciences, poultry, dairy, fisheries, science, and arts
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-green-600 dark:text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 focus:border-green-500 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <Select value={specialization} onValueChange={setSpecialization}>
            <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
              <SelectValue placeholder="Filter by specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              <SelectItem value="VETERINARY SCIENCES">Veterinary Sciences</SelectItem>
              <SelectItem value="POULTRY">Poultry</SelectItem>
              <SelectItem value="DAIRY">Dairy</SelectItem>
              <SelectItem value="FISHERIES">Fisheries</SelectItem>
              <SelectItem value="SCIENCE">Science</SelectItem>
              <SelectItem value="ARTS">Arts</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSearch} 
              className="bg-green-600 hover:bg-green-700 flex-1"
              disabled={isLoading}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button 
              onClick={resetFilters} 
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          Found {total} student{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Partners Grid */}
      {partners.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No students found</p>
          <p className="text-gray-500 dark:text-gray-500">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {partners.map((partner) => (
            <Card key={partner.id} className="hover:shadow-lg transition-shadow overflow-hidden group">
              <CardContent className="p-0">
                {/* Partner Image */}
                <div className="h-48 bg-gray-100 dark:bg-zinc-800">
                  {partner.partnerImage?.url ? (
                    <Image
                      src={partner.partnerImage.url}
                      alt={partner.partnerName}
                      width={300}
                      height={192}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <User2 className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Specialization Badge */}
                  {partner.specialization && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {partner.specialization}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Partner Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
                      {partner.partnerName}
                    </h3>
                    {partner.shopName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 flex items-center mt-1">
                        <Building2 className="w-3 h-3 mr-1" />
                        {partner.shopName}
                      </p>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm">
                    {partner.partnerEmail && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400 line-clamp-1">
                        <Mail className="w-3 h-3 mr-2 flex-shrink-0" />
                        {partner.partnerEmail}
                      </div>
                    )}
                    {partner.partnerMobileNumber && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Phone className="w-3 h-3 mr-2 flex-shrink-0" />
                        {partner.partnerMobileNumber}
                      </div>
                    )}
                    {(partner.cityName || partner.state) && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <MapPin className="w-3 h-3 mr-2 flex-shrink-0" />
                        {[partner.cityName, partner.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Professional Info */}
                  <div className="space-y-2">
                    {partner.qualificationDegree && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {partner.qualificationDegree}
                      </div>
                    )}
                    {partner.rvmpNumber && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Award className="w-3 h-3 mr-1" />
                        Student ID: {partner.rvmpNumber}
                      </div>
                    )}
                  </div>

                  {/* Available Days */}
                  {partner.availableDaysOfWeek.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available Days:</p>
                      <div className="flex flex-wrap gap-1">
                        {partner.availableDaysOfWeek.slice(0, 3).map((dayObj) => (
                          <Badge key={dayObj.day} variant="outline" className="text-xs">
                            {dayObj.day.slice(0, 3)}
                          </Badge>
                        ))}
                        {partner.availableDaysOfWeek.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{partner.availableDaysOfWeek.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* View Profile Button */}
                  <div className="pt-2">
                    <Link 
                      href={`/Students/${partner.id}`}
                      className="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors group"
                    >
                      View Profile
                      <ExternalLink className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>

                  {/* Join Date */}
                  <div className="flex items-center justify-center pt-2 border-t border-gray-100 dark:border-zinc-700">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      Member since {formatDistanceToNow(new Date(partner.createdAt))} ago
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {partners.length > 0 && (
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
    </div>
  )
}