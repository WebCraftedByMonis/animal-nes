'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Filter, X } from 'lucide-react'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import { motion, AnimatePresence } from 'framer-motion'

interface Product {
  id: number
  productName: string
  genericName: string | null
  category: string
  subCategory: string
  subsubCategory?: string
  productType: string
  companyId: number
  partnerId: number
  description: string | null
  dosage: string | null
  slug: string
  isActive: boolean
  createdAt: string
  company: { companyName: string }
  partner: { partnerName: string }
  image: { url: string; alt: string; publicId: string | null } | null
  variants: { packingVolume: string; customerPrice: number; companyPrice?: number; dealerPrice?: number; inventory: number }[]
}

// ----- Reusable debounce hook -----
function useDebounce<T>(value: T, delay = 500) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
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



export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const [sortBy, setSortBy] = useState<'createdAt' | 'productName'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(16)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all')
  const [subSubCategoryFilter, setSubSubCategoryFilter] = useState<string>('all')
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000])
  const [minPriceLimit, setMinPriceLimit] = useState(0)
  const [maxPriceLimit, setMaxPriceLimit] = useState(100000)
  const [showFilters, setShowFilters] = useState(false)

  const router = useRouter()

  // Reset to page 1 whenever the debounced search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  // Fetch when debouncedSearch OR any filter/sort/page changes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const { data } = await axios.get('/api/product', {
          params: {
            search: debouncedSearch, // <- debounced value only
            sortBy, sortOrder, page, limit,
            category: categoryFilter,
            subCategory: subCategoryFilter,
            subsubCategory: subSubCategoryFilter,
            productType: productTypeFilter,
            minPrice: priceRange[0],
            maxPrice: priceRange[1],
          },
        })

        setProducts(data.data)
        setTotal(data.total)

        if (data.minPrice !== undefined && data.maxPrice !== undefined) {
          setMinPriceLimit(data.minPrice)
          setMaxPriceLimit(data.maxPrice)
          if (priceRange[0] === 0 && priceRange[1] === 100000) {
            setPriceRange([data.minPrice, data.maxPrice])
          }
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to fetch products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [
    debouncedSearch, sortBy, sortOrder, page, limit,
    categoryFilter, subCategoryFilter, subSubCategoryFilter,
    productTypeFilter, priceRange
  ])

  // Reset page when filters (not search) change
  useEffect(() => {
    setPage(1)
  }, [categoryFilter, subCategoryFilter, subSubCategoryFilter, productTypeFilter, priceRange])

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-')
    setSortBy(field as 'createdAt' | 'productName')
    setSortOrder(order as 'asc' | 'desc')
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setSubCategoryFilter('all')
    setSubSubCategoryFilter('all')
    setProductTypeFilter('all')
    setPriceRange([minPriceLimit, maxPriceLimit])
    setPage(1)
  }

  const navigateToProduct = (p: Product) => {
    const path = p.slug ? `/products/${p.slug}` : `/products/${p.id}`
    router.push(path)
  }

  const totalPages = Math.ceil(total / limit)

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sub Category</Label>
        <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
          <SelectTrigger><SelectValue placeholder="All Sub Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub Categories</SelectItem>
            {subCategories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sub-Sub Category</Label>
        <Select value={subSubCategoryFilter} onValueChange={setSubSubCategoryFilter}>
          <SelectTrigger><SelectValue placeholder="All Sub-Sub Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub-Sub Categories</SelectItem>
            {subSubCategories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Product Type</Label>
        <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
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
      </div>

      <Button variant="outline" className="w-full" onClick={clearFilters}>
        <X className="mr-2 h-4 w-4" /> Clear Filters
      </Button>
    </div>
  )

  // Helper to pick a single variant (cheapest, fall back to first)
  const pickOneVariant = (p: Product) => {
    if (!p.variants || p.variants.length === 0) return null
    const cheapest = p.variants.reduce((a, b) => (a.customerPrice <= b.customerPrice ? a : b))
    return cheapest ?? p.variants[0]
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">All Products</h1>

      {/* Desktop Controls */}
      <div className="hidden lg:flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search product (details)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="focus:ring-green-500 w-[200px]"
        />

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

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sub Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub Categories</SelectItem>
            {subCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={subSubCategoryFilter} onValueChange={setSubSubCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sub-Sub Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub-Sub Categories</SelectItem>
            {subSubCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
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
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
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
          <Input
            placeholder="Search product (details)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:ring-green-500 flex-1"
          />
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

          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
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
              key={`${debouncedSearch}-${page}-${sortBy}-${sortOrder}-${categoryFilter}-${subCategoryFilter}-${subSubCategoryFilter}-${productTypeFilter}-${priceRange.join('-')}`}
            >
              {products.map((product) => {
                const v = pickOneVariant(product)
                return (
                  <motion.div
                    key={product.id}
                    
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
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-lg line-clamp-2 text-zinc-900 dark:text-zinc-100">{product.productName}</h3>
                      {product.genericName && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">{product.genericName}</p>
                      )}

                      {/* Single variant (cheapest) */}
                      {v && (
                        <div className="pt-1">
                          <Badge variant="outline" className="text-green-700 border-green-600/40 bg-white/60 dark:bg-zinc-900/60">
                            {v.packingVolume} – PKR {v.customerPrice.toLocaleString()}
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
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
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
                    onClick={() => setPage(pageNum)}
                    className={pageNum === page ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
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
