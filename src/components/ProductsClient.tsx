'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Filter, X, Search } from 'lucide-react'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import { motion, AnimatePresence } from 'framer-motion'
import WishlistButton from './WishlistButton'
import QuickAddToCartButton from './QuickAddToCartButton'

interface Product {
  id: number
  productName: string
  genericName: string | null
  category: string | null
  subCategory: string | null
  subsubCategory: string | null
  productType: string | null
  companyId: number
  partnerId: number
  description: string | null
  dosage: string | null
  productLink: string | null
  outofstock: boolean
  isFeatured: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  company: { companyName: string | null } | null
  partner: { partnerName: string } | null
  image: { url: string; alt: string; publicId: string | null } | null
  variants: { packingVolume: string | null; customerPrice: number | null; companyPrice?: number | null; dealerPrice?: number | null; inventory: number | null }[]
}

const categories = [
  "Veterinary","Poultry","Pets","Equine","Livestock Feed","Poultry Feed",
  "Instruments & Equipment","Fisheries & Aquaculture","Vaccination Services / Kits",
  "Herbal / Organic Products"
]

const subCategories = [
  "Antiparasitics","Antibiotics & Antibacterials","Vaccines & Immunologicals",
  "Nutritional Supplements","Growth Promoters","Coccidiostats","Pain Management / NSAIDs",
  "Reproductive Health / Hormones","Liver & Kidney Tonics","Respiratory Health / Expectorants"
]

const subSubCategories = [
  "Medicine","Supplements","Broad-Spectrum Dewormers","Multivitamins & Trace Elements",
  "Electrolytes & Hydration Solutions","Mineral Mixtures / Salt Licks","Probiotics & Enzymes",
  "Calcium / Phosphorus Supplements","Immuno-Stimulants","Hepato-Renal Protectants"
]

const productTypes = [
  "Injection (IV, IM, SC)","Tablet / Bolus / Pill","Oral Powder / Sachet","Oral Suspension / Syrup",
  "Spray / Aerosol","Oral Solution / Drops","Topical Application / Pour-on / Spot-on",
  "Premix (for feed inclusion)","Intrauterine / Intra-mammary","Transdermal Patch / Ointment / Cream"
]

// ----- Framer Motion variants -----
const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, x: -24, y: -18 },
  show: {
    opacity: 1,
    x: [-24, -12, 0, 8, 0],          // slight curved/overshoot motion
    y: [-18, -8, 0, -4, 0],
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

export default function ProductsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const [sortBy, setSortBy] = useState<'createdAt' | 'productName'>((searchParams.get('sortBy') as 'createdAt' | 'productName') || 'createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc')
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 16)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || 'all')
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>(searchParams.get('subCategory') || 'all')
  const [subSubCategoryFilter, setSubSubCategoryFilter] = useState<string>(searchParams.get('subsubCategory') || 'all')
  const [productTypeFilter, setProductTypeFilter] = useState<string>(searchParams.get('productType') || 'all')
  const [priceRange, setPriceRange] = useState<number[]>([
    Number(searchParams.get('minPrice')) || 0,
    Number(searchParams.get('maxPrice')) || 100000
  ])
  const [appliedPriceRange, setAppliedPriceRange] = useState<number[]>([
    Number(searchParams.get('minPrice')) || 0,
    Number(searchParams.get('maxPrice')) || 100000
  ])
  const [minPriceLimit, setMinPriceLimit] = useState(0)
  const [maxPriceLimit, setMaxPriceLimit] = useState(100000)
  const [showFilters, setShowFilters] = useState(false)

  // Update URL params when filters change
  const updateURL = useCallback((params: {
    page?: number
    search?: string
    sortBy?: string
    sortOrder?: string
    limit?: number
    category?: string
    subCategory?: string
    subsubCategory?: string
    productType?: string
    minPrice?: number
    maxPrice?: number
  }) => {
    const urlParams = new URLSearchParams()

    const p = params.page ?? page
    const s = params.search ?? search
    const sb = params.sortBy ?? sortBy
    const so = params.sortOrder ?? sortOrder
    const l = params.limit ?? limit
    const cat = params.category ?? categoryFilter
    const subCat = params.subCategory ?? subCategoryFilter
    const subSubCat = params.subsubCategory ?? subSubCategoryFilter
    const pt = params.productType ?? productTypeFilter
    const minP = params.minPrice ?? appliedPriceRange[0]
    const maxP = params.maxPrice ?? appliedPriceRange[1]

    if (p > 1) urlParams.set('page', String(p))
    if (s) urlParams.set('search', s)
    if (sb !== 'createdAt') urlParams.set('sortBy', sb)
    if (so !== 'desc') urlParams.set('sortOrder', so)
    if (l !== 16) urlParams.set('limit', String(l))
    if (cat !== 'all') urlParams.set('category', cat)
    if (subCat !== 'all') urlParams.set('subCategory', subCat)
    if (subSubCat !== 'all') urlParams.set('subsubCategory', subSubCat)
    if (pt !== 'all') urlParams.set('productType', pt)
    if (minP !== minPriceLimit) urlParams.set('minPrice', String(minP))
    if (maxP !== maxPriceLimit) urlParams.set('maxPrice', String(maxP))

    const queryString = urlParams.toString()
    router.push(queryString ? `/products?${queryString}` : '/products', { scroll: false })
  }, [router, page, search, sortBy, sortOrder, limit, categoryFilter, subCategoryFilter, subSubCategoryFilter, productTypeFilter, appliedPriceRange, minPriceLimit, maxPriceLimit])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/product', {
        params: {
          search: search || undefined,
          sortBy,
          sortOrder,
          page,
          limit,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          subCategory: subCategoryFilter === 'all' ? undefined : subCategoryFilter,
          subsubCategory: subSubCategoryFilter === 'all' ? undefined : subSubCategoryFilter,
          productType: productTypeFilter === 'all' ? undefined : productTypeFilter,
          minPrice: appliedPriceRange[0],
          maxPrice: appliedPriceRange[1],
        },
      })

      setProducts(data.data || [])
      setTotal(data.total || 0)

      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        setMinPriceLimit(data.minPrice)
        setMaxPriceLimit(data.maxPrice)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch products')
      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder, categoryFilter, subCategoryFilter, subSubCategoryFilter, productTypeFilter, appliedPriceRange])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

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

  const handlePriceFilter = () => {
    setAppliedPriceRange([...priceRange])
    setPage(1)
    updateURL({ page: 1, minPrice: priceRange[0], maxPrice: priceRange[1] })
  }

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-')
    setSortBy(field as 'createdAt' | 'productName')
    setSortOrder(order as 'asc' | 'desc')
    setPage(1)
    updateURL({ page: 1, sortBy: field, sortOrder: order })
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setPage(1)
    updateURL({ page: 1, category: value })
  }

  const handleSubCategoryChange = (value: string) => {
    setSubCategoryFilter(value)
    setPage(1)
    updateURL({ page: 1, subCategory: value })
  }

  const handleSubSubCategoryChange = (value: string) => {
    setSubSubCategoryFilter(value)
    setPage(1)
    updateURL({ page: 1, subsubCategory: value })
  }

  const handleProductTypeChange = (value: string) => {
    setProductTypeFilter(value)
    setPage(1)
    updateURL({ page: 1, productType: value })
  }

  const handleLimitChange = (value: string) => {
    const newLimit = Number(value)
    setLimit(newLimit)
    setPage(1)
    updateURL({ page: 1, limit: newLimit })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    updateURL({ page: newPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setCategoryFilter('all')
    setSubCategoryFilter('all')
    setSubSubCategoryFilter('all')
    setProductTypeFilter('all')
    setPriceRange([minPriceLimit, maxPriceLimit])
    setAppliedPriceRange([minPriceLimit, maxPriceLimit])
    setPage(1)
    router.push('/products', { scroll: false })
  }

  const navigateToProduct = (p: Product) => {
    router.push(`/products/${p.id}`)
  }

  const totalPages = Math.ceil(total / limit)

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sub Category</Label>
        <Select value={subCategoryFilter} onValueChange={handleSubCategoryChange}>
          <SelectTrigger><SelectValue placeholder="All Sub Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub Categories</SelectItem>
            {subCategories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sub-Sub Category</Label>
        <Select value={subSubCategoryFilter} onValueChange={handleSubSubCategoryChange}>
          <SelectTrigger><SelectValue placeholder="All Sub-Sub Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub-Sub Categories</SelectItem>
            {subSubCategories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Product Type</Label>
        <Select value={productTypeFilter} onValueChange={handleProductTypeChange}>
          <SelectTrigger><SelectValue placeholder="All Product Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Product Types</SelectItem>
            {productTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Price Range: PKR {priceRange[0].toLocaleString()} - PKR {priceRange[1].toLocaleString()}</Label>
        <Slider
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as number[])}
          max={maxPriceLimit}
          min={minPriceLimit}
          step={100}
          className="w-full"
        />
        <Button
          onClick={handlePriceFilter}
          size="sm"
          className="w-full bg-blue-500 hover:bg-blue-600"
        >
          Apply Price Filter
        </Button>
      </div>

      <Button variant="outline" className="w-full" onClick={clearFilters}>
        <X className="mr-2 h-4 w-4" /> Clear Filters
      </Button>
    </div>
  )

  // Helper to pick a single variant (cheapest, fall back to first)
  const pickOneVariant = (p: Product) => {
    if (!p.variants || p.variants.length === 0) return null
    const validVariants = p.variants.filter(v => v.customerPrice !== null)
    if (validVariants.length === 0) return p.variants[0]
    const cheapest = validVariants.reduce((a, b) => 
      (a.customerPrice || 0) <= (b.customerPrice || 0) ? a : b
    )
    return cheapest ?? p.variants[0]
  }

  return (
    <div className="space-y-6">
      {/* Desktop Controls */}
      <div className="hidden lg:flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          <Input
            placeholder="Search product (details)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="focus:ring-green-500 w-[200px]"
          />
          <Button
            onClick={handleSearch}
            size="sm"
            className="bg-green-500 hover:bg-green-600 px-3"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt-desc">Latest</SelectItem>
            <SelectItem value="createdAt-asc">Oldest</SelectItem>
            <SelectItem value="productName-asc">A - Z</SelectItem>
            <SelectItem value="productName-desc">Z - A</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={subCategoryFilter} onValueChange={handleSubCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sub Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub Categories</SelectItem>
            {subCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={subSubCategoryFilter} onValueChange={handleSubSubCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sub-Sub Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub-Sub Categories</SelectItem>
            {subSubCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={productTypeFilter} onValueChange={handleProductTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Product Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Product Types</SelectItem>
            {productTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm">Show</span>
          <Select value={String(limit)} onValueChange={handleLimitChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[16, 24, 32, 40, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
            </SelectContent>
          </Select>
          <span className="text-sm">entries</span>
        </div>

        <Button variant="outline" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" /> Clear
        </Button>
      </div>

      {/* Mobile Controls */}
      <div className="lg:hidden flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="flex gap-1 flex-1">
            <Input
              placeholder="Search product (details)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="focus:ring-green-500 flex-1"
            />
            <Button
              onClick={handleSearch}
              size="sm"
              className="bg-green-500 hover:bg-green-600 px-3"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Apply Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Apply filters to narrow down your search</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FiltersContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-2">
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Latest</SelectItem>
              <SelectItem value="createdAt-asc">Oldest</SelectItem>
              <SelectItem value="productName-asc">A - Z</SelectItem>
              <SelectItem value="productName-desc">Z - A</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(limit)} onValueChange={handleLimitChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[16, 24, 32, 40, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Price Range */}
      <div className="hidden lg:block">
        <div className="flex items-center gap-4">
          <Label>Price Range:</Label>
          <span>PKR {priceRange[0].toLocaleString()}</span>
          <Slider
            value={priceRange}
            onValueChange={(v) => setPriceRange(v as number[])}
            max={maxPriceLimit}
            min={minPriceLimit}
            step={100}
            className="w-[300px]"
          />
          <span>PKR {priceRange[1].toLocaleString()}</span>
          <Button 
            onClick={handlePriceFilter} 
            size="sm" 
            className="bg-blue-500 hover:bg-blue-600"
          >
            Apply Price Filter
          </Button>
        </div>
      </div>

      {/* Product Grid with motion + neumorphism cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, i) => (<ProductCardSkeleton key={i} />))}
        </div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              variants={gridVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              key={`${search}-${page}-${sortBy}-${sortOrder}-${categoryFilter}-${subCategoryFilter}-${subSubCategoryFilter}-${productTypeFilter}-${appliedPriceRange.join('-')}`}
            >
              {products.map((product) => {
                const v = pickOneVariant(product)
                return (
                  <motion.div
                    key={product.id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    onClick={() => navigateToProduct(product)}
                    className={[
                      // Neumorphism card
                      "cursor-pointer rounded-2xl overflow-hidden",
                      "bg-[#f0f0f3] dark:bg-zinc-900",
                      "shadow-[8px_8px_16px_#d1d9e6,_-8px_-8px_16px_#ffffff]",
                      "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),_-8px_-8px_16px_rgba(255,255,255,0.05)]",
                      "border border-zinc-100/40 dark:border-zinc-800/60",
                      "transition-all"
                    ].join(' ')}
                  >
                    {/* Full-bleed image area (no padding around image) */}
                    {product.image && (
                      <div className="relative aspect-square w-full">
                        <Image
                          src={product.image.url}
                          alt={product.image.alt || product.productName}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                          priority={false}
                        />
                        <WishlistButton productId={product.id} />
                        <QuickAddToCartButton
                          productId={product.id}
                          variantId={v?.id}
                          className="absolute bottom-3 right-3 z-10"
                        />
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-lg line-clamp-2 text-zinc-900 dark:text-zinc-100">{product.productName}</h3>
                      {product.genericName && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">{product.genericName}</p>
                      )}

                      {/* Single variant (cheapest) */}
                      {v && v.customerPrice && (
                        <div className="pt-1">
                          <Badge variant="outline" className="text-green-700 border-green-600/40 bg-white/60 dark:bg-zinc-900/60">
                            {v.packingVolume || 'N/A'} – PKR {v.customerPrice.toLocaleString()}
                          </Badge>
                        </div>
                      )}

                      <div className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">
                        <span className="font-medium">By:</span> {product.company?.companyName}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>Previous</Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) pageNum = i + 1
                else if (page <= 3) pageNum = i + 1
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = page - 2 + i
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
              <Button variant="outline" disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductCardSkeleton() {
  return (
    <div className={[
      "rounded-2xl overflow-hidden",
      "bg-[#f0f0f3] dark:bg-zinc-900",
      "shadow-[8px_8px_16px_#d1d9e6,_-8px_-8px_16px_#ffffff]",
      "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),_-8px_-8px_16px_rgba(255,255,255,0.05)]",
      "border border-zinc-100/40 dark:border-zinc-800/60",
      "p-0"
    ].join(' ')}>
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}