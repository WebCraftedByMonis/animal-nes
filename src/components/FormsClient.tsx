'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Filter, X, Search } from 'lucide-react'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import { motion, AnimatePresence } from 'framer-motion'
import FormCard from './FormCard'

interface DynamicForm {
  id: string
  title: string
  description: string | null
  slug: string
  thumbnailUrl: string | null
  thumbnailPublicId: string | null
  paymentRequired: boolean
  paymentAmount: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    fields: number
    submissions: number
  }
}

// ----- Framer Motion variants -----
const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
}

export default function FormsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [forms, setForms] = useState<DynamicForm[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const [sortBy, setSortBy] = useState<'createdAt' | 'title'>((searchParams.get('sortBy') as 'createdAt' | 'title') || 'createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc')
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 12)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)

  // Filters
  const [paymentFilter, setPaymentFilter] = useState<string>(searchParams.get('paymentRequired') || 'all')
  const [showFilters, setShowFilters] = useState(false)

  // Update URL params when filters change
  const updateURL = useCallback((params: {
    page?: number
    search?: string
    sortBy?: string
    sortOrder?: string
    limit?: number
    paymentRequired?: string
  }) => {
    const urlParams = new URLSearchParams()

    const p = params.page ?? page
    const s = params.search ?? search
    const sb = params.sortBy ?? sortBy
    const so = params.sortOrder ?? sortOrder
    const l = params.limit ?? limit
    const pf = params.paymentRequired ?? paymentFilter

    if (p > 1) urlParams.set('page', String(p))
    if (s) urlParams.set('search', s)
    if (sb !== 'createdAt') urlParams.set('sortBy', sb)
    if (so !== 'desc') urlParams.set('sortOrder', so)
    if (l !== 12) urlParams.set('limit', String(l))
    if (pf !== 'all') urlParams.set('paymentRequired', pf)

    const queryString = urlParams.toString()
    router.push(queryString ? `/forms?${queryString}` : '/forms', { scroll: false })
  }, [router, page, search, sortBy, sortOrder, limit, paymentFilter])

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/forms-listing', {
        params: {
          search: search || undefined,
          sortBy,
          sortOrder,
          page,
          limit,
          paymentRequired: paymentFilter === 'all' ? undefined : paymentFilter,
        },
      })

      setForms(data.data || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch forms')
      setForms([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder, paymentFilter])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
    updateURL({ page: 1, search: searchInput })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-')
    setSortBy(field as 'createdAt' | 'title')
    setSortOrder(order as 'asc' | 'desc')
    setPage(1)
    updateURL({ page: 1, sortBy: field, sortOrder: order })
  }

  const handlePaymentFilterChange = (value: string) => {
    setPaymentFilter(value)
    setPage(1)
    updateURL({ page: 1, paymentRequired: value })
  }

  const handleLimitChange = (value: string) => {
    const newLimit = Number(value)
    setLimit(newLimit)
    setPage(1)
    updateURL({ page: 1, limit: newLimit })
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setPaymentFilter('all')
    setSortBy('createdAt')
    setSortOrder('desc')
    setPage(1)
    router.push('/forms')
  }

  const totalPages = Math.ceil(total / limit)

  // Pagination buttons logic (show max 5 page buttons)
  const getPageButtons = () => {
    const buttons = []
    const maxButtons = 5
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2))
    let endPage = Math.min(totalPages, startPage + maxButtons - 1)

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(i)
    }
    return buttons
  }

  const FilterSection = () => (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Search Forms</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search by title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="icon" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Payment Filter */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Payment Required</Label>
        <Select value={paymentFilter} onValueChange={handlePaymentFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Forms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            <SelectItem value="true">Paid Forms</SelectItem>
            <SelectItem value="false">Free Forms</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        onClick={clearFilters}
        className="w-full"
      >
        <X className="mr-2 h-4 w-4" />
        Clear Filters
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Desktop Filters Sidebar */}
      <div className="hidden lg:block w-64 space-y-4">
        <div className="p-4 rounded-2xl border bg-white shadow-sm">
          <h3 className="font-semibold mb-4 text-lg">Filters</h3>
          <FilterSection />
        </div>
      </div>

      {/* Mobile Filters Sheet */}
      <div className="lg:hidden">
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Filter forms by various criteria
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FilterSection />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* Top Bar: Sort & Limit */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="text-sm text-gray-600">
            Showing {forms.length} of {total} forms
          </div>

          <div className="flex gap-2">
            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            {/* Limit */}
            <Select value={String(limit)} onValueChange={handleLimitChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="36">36</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton key={i} className="h-[320px] rounded-2xl" />
            ))}
          </div>
        )}

        {/* Forms Grid */}
        {!loading && forms.length > 0 && (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {forms.map((form) => (
                <motion.div key={form.id} variants={cardVariants}>
                  <FormCard form={form} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* No Results */}
        {!loading && forms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No forms found</p>
            <Button onClick={clearFilters} variant="outline" className="mt-4">
              Clear Filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {!loading && forms.length > 0 && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => {
                const newPage = page - 1
                setPage(newPage)
                updateURL({ page: newPage })
              }}
              disabled={page === 1}
            >
              Previous
            </Button>

            {getPageButtons().map((pageNum) => (
              <Button
                key={pageNum}
                variant={page === pageNum ? 'default' : 'outline'}
                onClick={() => {
                  setPage(pageNum)
                  updateURL({ page: pageNum })
                }}
                className={page === pageNum ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {pageNum}
              </Button>
            ))}

            <Button
              variant="outline"
              onClick={() => {
                const newPage = page + 1
                setPage(newPage)
                updateURL({ page: newPage })
              }}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
