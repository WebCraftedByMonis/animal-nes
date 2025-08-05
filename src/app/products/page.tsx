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
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Filter, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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
  company: {
    companyName: string
  }
  partner: {
    partnerName: string
  }
  image: {
    url: string
    alt: string
    publicId: string | null
  } | null
  variants: {
    packingVolume: string
    customerPrice: number
    companyPrice?: number
    dealerPrice?: number
    inventory: number
  }[]
}

const categories = [
  "Veterinary",
  "Poultry",
  "Pets",
  "Equine",
  "Livestock Feed",
  "Poultry Feed",
  "Instruments & Equipment",
  "Fisheries & Aquaculture",
  "Vaccination Services / Kits",
  "Herbal / Organic Products"
]

const subCategories = [
  "Antiparasitics",
  "Antibiotics & Antibacterials",
  "Vaccines & Immunologicals",
  "Nutritional Supplements",
  "Growth Promoters",
  "Coccidiostats",
  "Pain Management / NSAIDs",
  "Reproductive Health / Hormones",
  "Liver & Kidney Tonics",
  "Respiratory Health / Expectorants"
]

const subSubCategories = [
  "Medicine",
  "Supplements",
  "Broad-Spectrum Dewormers",
  "Multivitamins & Trace Elements",
  "Electrolytes & Hydration Solutions",
  "Mineral Mixtures / Salt Licks",
  "Probiotics & Enzymes",
  "Calcium / Phosphorus Supplements",
  "Immuno-Stimulants",
  "Hepato-Renal Protectants"
]

const productTypes = [
  "Injection (IV, IM, SC)",
  "Tablet / Bolus / Pill",
  "Oral Powder / Sachet",
  "Oral Suspension / Syrup",
  "Spray / Aerosol",
  "Oral Solution / Drops",
  "Topical Application / Pour-on / Spot-on",
  "Premix (for feed inclusion)",
  "Intrauterine / Intra-mammary",
  "Transdermal Patch / Ointment / Cream"
]

export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'productName'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(16)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all')
  const [subSubCategoryFilter, setSubSubCategoryFilter] = useState<string>('all')
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000])
  const [minPriceLimit, setMinPriceLimit] = useState(0)
  const [maxPriceLimit, setMaxPriceLimit] = useState(100000)
  const [showFilters, setShowFilters] = useState(false)
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  const router = useRouter()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/product', {
        params: { 
          search: debouncedSearch,
          sortBy, 
          sortOrder, 
          page, 
          limit,
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
      
      // Update price limits from backend
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        setMinPriceLimit(data.minPrice)
        setMaxPriceLimit(data.maxPrice)
        // Only update price range if it's the initial load
        if (priceRange[0] === 0 && priceRange[1] === 100000) {
          setPriceRange([data.minPrice, data.maxPrice])
        }
      }
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, sortBy, sortOrder, page, limit, categoryFilter, subCategoryFilter, subSubCategoryFilter, productTypeFilter, priceRange])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Reset page when filters change
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

  const navigateToProduct = (product: Product) => {
    const path = product.slug ? `/products/${product.slug}` : `/products/${product.id}`
    router.push(path)
  }

  const totalPages = Math.ceil(total / limit)

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sub Category</Label>
        <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Sub Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub Categories</SelectItem>
            {subCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sub-Sub Category</Label>
        <Select value={subSubCategoryFilter} onValueChange={setSubSubCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Sub-Sub Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub-Sub Categories</SelectItem>
            {subSubCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Product Type</Label>
        <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Product Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Product Types</SelectItem>
            {productTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Price Range: PKR {priceRange[0].toLocaleString()} - PKR {priceRange[1].toLocaleString()}</Label>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as number[])}
          max={maxPriceLimit}
          min={minPriceLimit}
          step={100}
          className="w-full"
        />
      </div>

      <Button 
        variant="outline" 
        className="w-full"
        onClick={clearFilters}
      >
        <X className="mr-2 h-4 w-4" />
        Clear Filters
      </Button>
    </div>
  )

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">All Products</h1>

      {/* Desktop Filters */}
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
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sub Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub Categories</SelectItem>
            {subCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={subSubCategoryFilter} onValueChange={setSubSubCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sub-Sub Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub-Sub Categories</SelectItem>
            {subSubCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Product Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Product Types</SelectItem>
            {productTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm">Show</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[16, 24, 32, 40, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm">entries</span>
        </div>

        <Button variant="outline" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Mobile Filters */}
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
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Apply filters to narrow down your search
                </SheetDescription>
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
              {[16, 24, 32, 40, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Price Range Filter for Desktop */}
      <div className="hidden lg:block">
        <div className="flex items-center gap-4">
          <Label>Price Range:</Label>
          <span>PKR {priceRange[0].toLocaleString()}</span>
          <Slider
            value={priceRange}
            onValueChange={(value) => setPriceRange(value as number[])}
            max={maxPriceLimit}
            min={minPriceLimit}
            step={100}
            className="w-[300px]"
          />
          <span>PKR {priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      {/* Active Filters Display
      {(search || categoryFilter !== 'all' || subCategoryFilter !== 'all' || 
        subSubCategoryFilter !== 'all' || productTypeFilter !== 'all' || 
        priceRange[0] !== minPriceLimit || priceRange[1] !== maxPriceLimit) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {search && (
            <Badge variant="secondary">
              Search: {search}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSearch('')} />
            </Badge>
          )}
          {categoryFilter !== 'all' && (
            <Badge variant="secondary">
              Category: {categoryFilter}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
            </Badge>
          )}
          {subCategoryFilter !== 'all' && (
            <Badge variant="secondary">
              Sub: {subCategoryFilter}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSubCategoryFilter('all')} />
            </Badge>
          )}
          {(priceRange[0] !== minPriceLimit || priceRange[1] !== maxPriceLimit) && (
            <Badge variant="secondary">
              Price: PKR {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setPriceRange([minPriceLimit, maxPriceLimit])} />
            </Badge>
          )}
        </div>
      )} */}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigateToProduct(product)}
              >
                {product.image && (
                  <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3">
                    <Image
                      src={product.image.url}
                      alt={product.image.alt || product.productName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-bold text-lg line-clamp-2">{product.productName}</h3>
                  {product.genericName && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{product.genericName}</p>
                  )}
                  
                  <div className="space-y-1">
                    {product.variants.map((variant, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {variant.packingVolume} – PKR {variant.customerPrice.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground line-clamp-1">
                    <span className="font-medium">By:</span> {product.company?.companyName}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button 
                variant="outline" 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
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
                disabled={page === totalPages}
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

function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}