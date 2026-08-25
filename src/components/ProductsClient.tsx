'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toProductUrl } from '@/lib/slug-utils'
import { track } from '@/lib/trackingClient'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Filter, X, Search, Sparkles, ArrowRight } from 'lucide-react'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import { motion, AnimatePresence } from 'framer-motion'
import WishlistButton from './WishlistButton'
import QuickAddToCartButton from './QuickAddToCartButton'
import QuickBuyNowButton from './QuickBuyNowButton'
import { useCountry } from '@/contexts/CountryContext'
import { formatPrice } from '@/lib/currency-utils'
import { SearchableCombobox } from '@/components/shared/SearchableCombobox'
import ProductPortions from './products/ProductPortions'

interface Discount {
  id: number
  name: string
  percentage: number
  startDate: string
  endDate: string
  isActive: boolean
  companyId: number | null
  productId: number | null
  variantId: number | null
}

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
  variants: { id?: number; packingVolume: string | null; customerPrice: number | null; companyPrice?: number | null; dealerPrice?: number | null; inventory: number | null }[]
  discounts?: Discount[]
}

// Admin-picked homepage/shop-wide spotlight — see /api/featured-company and
// /dashboard/featured-company. `products` here is a lightweight subset
// (just enough for the carousel/card), distinct from the full `Product`
// shape the rest of this page fetches from /api/product.
interface FeaturedCompanyProduct {
  id: number
  productName: string
  category: string | null
  image: { url: string; alt: string } | null
  price: number | null
}

interface FeaturedCompany {
  companyId: number
  companyName: string | null
  tagline: string | null
  ctaText: string | null
  bannerImageUrl: string | null
  products: FeaturedCompanyProduct[]
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
  const { country, currencySymbol } = useCountry()

  // Initialize state from URL params
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const [sortBy, setSortBy] = useState<'relevance' | 'createdAt' | 'productName'>((searchParams.get('sortBy') as 'relevance' | 'createdAt' | 'productName') || 'relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc')
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 16)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || 'all')
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>(searchParams.get('subCategory') || 'all')
  const [subSubCategoryFilter, setSubSubCategoryFilter] = useState<string>(searchParams.get('subsubCategory') || 'all')
  const [productTypeFilter, setProductTypeFilter] = useState<string>(searchParams.get('productType') || 'all')
  const [companyFilter, setCompanyFilter] = useState<string>(searchParams.get('companyId') || '')
  const [partnerFilter, setPartnerFilter] = useState<string>(searchParams.get('partnerId') || '')

  // Admin-picked homepage/shop-wide spotlight (see /dashboard/featured-company).
  // Drives both the "Featured Brand" badge on matching product cards and the
  // product carousel at the top of the page.
  const [featuredCompany, setFeaturedCompany] = useState<FeaturedCompany | null>(null)
  useEffect(() => {
    fetch('/api/featured-company')
      .then((res) => res.json())
      .then((data) => setFeaturedCompany(data.featured ?? null))
      .catch(() => {})
  }, [])
  const featuredCompanyId = featuredCompany?.companyId ?? null

  // Dismissible, keyed to companyId — dismissing one company's rail doesn't
  // hide a *different* company's rail if the admin changes the spotlight.
  const [dismissedFeaturedId, setDismissedFeaturedId] = useState<number | null>(null)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissedFeaturedCompanyId')
      if (stored) setDismissedFeaturedId(Number(stored))
    } catch {}
  }, [])
  const dismissFeaturedRail = (companyId: number) => {
    setDismissedFeaturedId(companyId)
    try {
      localStorage.setItem('dismissedFeaturedCompanyId', String(companyId))
    } catch {}
  }

  // Track if price filter was explicitly applied by user (via URL params or button click)
  const hasPriceFilterFromUrl = searchParams.get('minPrice') !== null || searchParams.get('maxPrice') !== null
  const [priceFilterApplied, setPriceFilterApplied] = useState(hasPriceFilterFromUrl)
  const initialPriceSetRef = useRef(false)

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
    companyId?: string
    partnerId?: string
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
    const cid = params.companyId !== undefined ? params.companyId : companyFilter
    const pid = params.partnerId !== undefined ? params.partnerId : partnerFilter

    if (p > 1) urlParams.set('page', String(p))
    if (s) urlParams.set('search', s)
    if (sb !== 'relevance') urlParams.set('sortBy', sb)
    if (so !== 'desc') urlParams.set('sortOrder', so)
    if (l !== 16) urlParams.set('limit', String(l))
    if (cat !== 'all') urlParams.set('category', cat)
    if (subCat !== 'all') urlParams.set('subCategory', subCat)
    if (subSubCat !== 'all') urlParams.set('subsubCategory', subSubCat)
    if (pt !== 'all') urlParams.set('productType', pt)
    if (cid) urlParams.set('companyId', cid)
    if (pid) urlParams.set('partnerId', pid)

    // Only add price params if explicitly provided (when user clicks Apply Price Filter)
    if (params.minPrice !== undefined) urlParams.set('minPrice', String(params.minPrice))
    if (params.maxPrice !== undefined) urlParams.set('maxPrice', String(params.maxPrice))

    const queryString = urlParams.toString()
    router.push(queryString ? `/products?${queryString}` : '/products', { scroll: false })
  }, [router, page, search, sortBy, sortOrder, limit, categoryFilter, subCategoryFilter, subSubCategoryFilter, productTypeFilter, companyFilter, partnerFilter])

  // No search/filter active: the page shows the portioned, category-by-
  // category view (ProductPortions) instead of fetching + rendering the
  // flat all-products grid below. Any search or filter switches back to
  // the classic flat grid.
  const isPortionedView =
    !search &&
    categoryFilter === 'all' &&
    subCategoryFilter === 'all' &&
    subSubCategoryFilter === 'all' &&
    productTypeFilter === 'all' &&
    !companyFilter &&
    !partnerFilter &&
    !priceFilterApplied

  // Featured Company rail: render behaviour is a function of page state, not
  // just page identity — a carousel above search results does real damage
  // to someone hunting a specific brand-name product, so it only ever shows
  // on the truly unfiltered/unsearched view or a filtered view where it can
  // narrow (not distract). Never past page 1 — pagination is precisely when
  // someone has committed to a specific slice of results.
  // - 'full': no search, no filters (isPortionedView) — the company's
  //   generic top products (static, from /api/featured-company).
  // - 'scoped': filters active but no search text — that company's
  //   products *within the current filters* (live query below), so the
  //   rail narrows instead of advertises.
  // - 'hidden': a search term is present, page > 1, or the grid is already
  //   filtered down to just this company (the rail would be redundant).
  const featuredRailMode: 'full' | 'scoped' | 'hidden' = (() => {
    if (!featuredCompany || featuredCompany.companyId === dismissedFeaturedId) return 'hidden'
    if (search) return 'hidden'
    if (page !== 1) return 'hidden'
    if (companyFilter === String(featuredCompany.companyId)) return 'hidden'
    return isPortionedView ? 'full' : 'scoped'
  })()

  // Live-scoped rail data for 'scoped' mode — a separate, small query
  // (reuses /api/product, same indexes and caching as the main grid, no new
  // caching surface to maintain) rather than joined into the main filtered
  // query, so it can never slow down the grid's own fetch.
  const [scopedFeaturedProducts, setScopedFeaturedProducts] = useState<FeaturedCompanyProduct[] | null>(null)
  const [scopedFeaturedTotal, setScopedFeaturedTotal] = useState(0)
  useEffect(() => {
    if (featuredRailMode !== 'scoped' || !featuredCompany) {
      setScopedFeaturedProducts(null)
      return
    }
    let cancelled = false
    axios
      .get('/api/product', {
        params: {
          publicOnly: true,
          companyId: featuredCompany.companyId,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          subCategory: subCategoryFilter === 'all' ? undefined : subCategoryFilter,
          subsubCategory: subSubCategoryFilter === 'all' ? undefined : subSubCategoryFilter,
          productType: productTypeFilter === 'all' ? undefined : productTypeFilter,
          minPrice: priceFilterApplied ? appliedPriceRange[0] : undefined,
          maxPrice: priceFilterApplied ? appliedPriceRange[1] : undefined,
          sortBy: 'relevance',
          limit: 12,
        },
      })
      .then(({ data }) => {
        if (cancelled) return
        setScopedFeaturedProducts(
          (data.data || []).map((p: Product) => ({
            id: p.id,
            productName: p.productName,
            category: p.category,
            image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
            price: p.variants?.[0]?.customerPrice ?? null,
          }))
        )
        setScopedFeaturedTotal(data.total || 0)
      })
      .catch(() => {
        if (!cancelled) setScopedFeaturedProducts([])
      })
    return () => {
      cancelled = true
    }
  }, [featuredRailMode, featuredCompany, categoryFilter, subCategoryFilter, subSubCategoryFilter, productTypeFilter, priceFilterApplied, appliedPriceRange])

  // De-dupe: never show a product in the rail that's already sitting in the
  // grid's first row, or the same company occupies the whole top of the
  // page twice. Only matters in 'scoped' mode — 'full' mode shows the
  // portioned view instead of this page's `products` grid state.
  const featuredRailProductsRaw =
    featuredRailMode === 'full' ? featuredCompany?.products ?? [] : featuredRailMode === 'scoped' ? scopedFeaturedProducts ?? [] : []
  const gridIdsAboveFold = new Set(featuredRailMode === 'scoped' ? products.slice(0, 8).map((p) => p.id) : [])
  const featuredRailProducts = featuredRailProductsRaw.filter((p) => !gridIdsAboveFold.has(p.id))

  const activeFilterLabel =
    subSubCategoryFilter !== 'all' ? subSubCategoryFilter :
    subCategoryFilter !== 'all' ? subCategoryFilter :
    categoryFilter !== 'all' ? categoryFilter :
    productTypeFilter !== 'all' ? productTypeFilter :
    'your filters'

  const fetchProducts = useCallback(async () => {
    if (isPortionedView) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get('/api/product', {
        params: {
          publicOnly: true,
          search: search || undefined,
          sortBy,
          sortOrder,
          page,
          limit,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          subCategory: subCategoryFilter === 'all' ? undefined : subCategoryFilter,
          subsubCategory: subSubCategoryFilter === 'all' ? undefined : subSubCategoryFilter,
          productType: productTypeFilter === 'all' ? undefined : productTypeFilter,
          companyId: companyFilter || undefined,
          partnerId: partnerFilter || undefined,
          // Only send price filter when explicitly applied by user
          minPrice: priceFilterApplied ? appliedPriceRange[0] : undefined,
          maxPrice: priceFilterApplied ? appliedPriceRange[1] : undefined,
          // Filter by country
          country: country,
        },
      })

      setProducts(data.data || [])
      setTotal(data.total || 0)

      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        setMinPriceLimit(data.minPrice)
        setMaxPriceLimit(data.maxPrice)
        // Update only the slider display range on first load (not appliedPriceRange)
        if (!initialPriceSetRef.current) {
          initialPriceSetRef.current = true
          setPriceRange([data.minPrice, data.maxPrice])
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch products')
      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [isPortionedView, page, limit, search, sortBy, sortOrder, categoryFilter, subCategoryFilter, subSubCategoryFilter, productTypeFilter, companyFilter, partnerFilter, appliedPriceRange, priceFilterApplied, country])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // One impression per product shown on this page of results — feeds the
  // ranking engine's CTR/relevance signals (see src/lib/ranking.ts).
  useEffect(() => {
    products.forEach((product) => track('PRODUCT_IMPRESSION', { productId: product.id }))
  }, [products])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
    updateURL({ page: 1, search: searchInput })
    if (searchInput.trim()) track('SEARCH', { searchQuery: searchInput.trim() })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePriceFilter = () => {
    setPriceFilterApplied(true)
    setAppliedPriceRange([...priceRange])
    setPage(1)
    updateURL({ page: 1, minPrice: priceRange[0], maxPrice: priceRange[1] })
  }

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-')
    setSortBy(field as 'relevance' | 'createdAt' | 'productName')
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

  const handleCompanyChange = (value: string) => {
    setCompanyFilter(value)
    setPage(1)
    updateURL({ page: 1, companyId: value })
  }

  const handlePartnerChange = (value: string) => {
    setPartnerFilter(value)
    setPage(1)
    updateURL({ page: 1, partnerId: value })
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
    setCompanyFilter('')
    setPartnerFilter('')
    setPriceRange([minPriceLimit, maxPriceLimit])
    setAppliedPriceRange([minPriceLimit, maxPriceLimit])
    setPriceFilterApplied(false)
    initialPriceSetRef.current = true // Keep as true since we already know the limits
    setPage(1)
    router.push('/products', { scroll: false })
  }

  const navigateToProduct = (p: Product) => {
    track('PRODUCT_CLICK', { productId: p.id })
    router.push(toProductUrl(p))
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
        <Label>Company</Label>
        <SearchableCombobox
          apiEndpoint="/api/company"
          searchKey="companyName"
          value={companyFilter}
          onChange={handleCompanyChange}
          placeholder="All Companies"
          extraParams={{ country }}
        />
      </div>

      <div className="space-y-2">
        <Label>Partner</Label>
        <SearchableCombobox
          apiEndpoint="/api/partner"
          searchKey="partnerName"
          value={partnerFilter}
          onChange={handlePartnerChange}
          placeholder="All Partners"
          extraParams={{ country }}
        />
      </div>

      <div className="space-y-2">
        <Label>Price Range: {currencySymbol} {priceRange[0].toLocaleString()} - {currencySymbol} {priceRange[1].toLocaleString()}</Label>
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

  // Helper to get active discount for a product/variant
  // Priority: variant-level > product-level > company-level
  const getActiveDiscount = (product: Product, variantId?: number): Discount | null => {
    if (!product.discounts || product.discounts.length === 0) return null

    const now = new Date()
    const activeDiscounts = product.discounts.filter(d => {
      if (!d.isActive) return false
      const start = new Date(d.startDate)
      const end = new Date(d.endDate)
      return now >= start && now <= end
    })

    if (activeDiscounts.length === 0) return null

    // Prioritize variant-specific discount
    if (variantId) {
      const variantDiscount = activeDiscounts.find(d => d.variantId === variantId)
      if (variantDiscount) return variantDiscount
    }

    // Then product-level discount (highest percentage)
    const productDiscounts = activeDiscounts.filter(d => d.productId !== null && d.variantId === null && d.companyId === null)
    if (productDiscounts.length > 0) {
      return productDiscounts.reduce((a, b) => a.percentage > b.percentage ? a : b)
    }

    // Finally company-level discount (highest percentage)
    const companyDiscounts = activeDiscounts.filter(d => d.companyId !== null && d.productId === null && d.variantId === null)
    if (companyDiscounts.length > 0) {
      return companyDiscounts.reduce((a, b) => a.percentage > b.percentage ? a : b)
    }

    return activeDiscounts[0]
  }

  // Calculate discounted price
  const calculateDiscountedPrice = (price: number, percentage: number): number => {
    return Math.round((price - (price * percentage / 100)) * 100) / 100
  }

  return (
    <div className="space-y-6">
      {/* Featured Company rail — see /dashboard/featured-company.
          Visibility is a function of page state (see featuredRailMode
          above), not just page identity: hidden during an explicit search
          or past page 1, "full" (generic top products) on the plain
          unfiltered view, "scoped" (that company's products *within* the
          current filters, with a real count) once filters are active — so
          it narrows instead of just advertising. Never both this container
          AND the per-card "Featured Brand" badge in the same viewport. */}
      {featuredRailMode !== 'hidden' && featuredCompany && featuredRailProducts.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border-l-4 border-amber-400 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 sm:p-4 [overscroll-behavior-x:contain]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">
                <Sparkles className="w-3 h-3" /> Brand in focus
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {featuredCompany.companyName}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {featuredRailMode === 'scoped'
                    ? `${scopedFeaturedTotal} product${scopedFeaturedTotal === 1 ? '' : 's'} in ${activeFilterLabel}`
                    : featuredCompany.tagline || 'Spotlighted this week'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
                onClick={() => handleCompanyChange(String(featuredCompany.companyId))}
              >
                {featuredRailMode === 'scoped' ? `Show all ${scopedFeaturedTotal}` : `Shop all`}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
              <button
                type="button"
                aria-label="Dismiss featured brand"
                onClick={() => dismissFeaturedRail(featuredCompany.companyId)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Carousel opts={{ loop: false, align: 'start' }} className="w-full">
            <CarouselContent>
              {featuredRailProducts.map((product, i) => (
                <CarouselItem key={product.id} className="basis-2/5 sm:basis-1/4 md:basis-[15%] lg:basis-[12%]">
                  <Link
                    href={toProductUrl(product)}
                    onClick={() => track('PRODUCT_CLICK', { productId: product.id, metadata: { source: 'products-page-featured-carousel' } })}
                    className="block rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:shadow-md hover:border-amber-400 transition-all"
                  >
                    <div className="relative aspect-square w-full bg-muted">
                      {product.image ? (
                        <Image
                          src={product.image.url.replace(/^http:\/\//, 'https://')}
                          alt={product.image.alt || product.productName}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 40vw, 12vw"
                          priority={i < 3}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium line-clamp-2 text-zinc-900 dark:text-zinc-100">{product.productName}</p>
                      {product.price !== null && (
                        <p className="text-xs font-bold text-green-600 mt-0.5">
                          {currencySymbol} {product.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-3 h-7 w-7" />
            <CarouselNext className="hidden sm:flex -right-3 h-7 w-7" />
          </Carousel>
        </div>
      )}

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
            <SelectItem value="relevance-desc">Recommended</SelectItem>
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

        <div className="w-[180px]">
          <SearchableCombobox
            apiEndpoint="/api/company"
            searchKey="companyName"
            value={companyFilter}
            onChange={handleCompanyChange}
            placeholder="All Companies"
            extraParams={{ country }}
          />
        </div>

        <div className="w-[180px]">
          <SearchableCombobox
            apiEndpoint="/api/partner"
            searchKey="partnerName"
            value={partnerFilter}
            onChange={handlePartnerChange}
            placeholder="All Partners"
            extraParams={{ country }}
          />
        </div>

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
              <SelectItem value="relevance-desc">Recommended</SelectItem>
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
          <span>{currencySymbol} {priceRange[0].toLocaleString()}</span>
          <Slider
            value={priceRange}
            onValueChange={(v) => setPriceRange(v as number[])}
            max={maxPriceLimit}
            min={minPriceLimit}
            step={100}
            className="w-[300px]"
          />
          <span>{currencySymbol} {priceRange[1].toLocaleString()}</span>
          <Button 
            onClick={handlePriceFilter} 
            size="sm" 
            className="bg-blue-500 hover:bg-blue-600"
          >
            Apply Price Filter
          </Button>
        </div>
      </div>

      {/* Default view: catalog split into category portions instead of one
          flat list of everything. Any search/filter switches to the classic
          grid below. */}
      {isPortionedView ? (
        <ProductPortions />
      ) : loading ? (
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
              key={`${search}-${page}-${sortBy}-${sortOrder}-${categoryFilter}-${subCategoryFilter}-${subSubCategoryFilter}-${productTypeFilter}-${companyFilter}-${partnerFilter}-${appliedPriceRange.join('-')}`}
            >
              {products.map((product) => {
                const v = pickOneVariant(product)
                const discount = getActiveDiscount(product, v?.id)
                const originalPrice = v?.customerPrice || 0
                const discountedPrice = discount ? calculateDiscountedPrice(originalPrice, discount.percentage) : originalPrice

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
                          src={product.image.url.replace(/^http:\/\//, 'https://')}
                          alt={product.image.alt || product.productName}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                          priority={false}
                          referrerPolicy="no-referrer"
                        />
                        {/* Discount + Featured Brand badges (stacked, never overlapping).
                            Card badge is suppressed while the Featured rail is visible above
                            (featuredRailMode === 'scoped') — one badge system per viewport;
                            the container above already carries that identity. Still shows in
                            'hidden' mode (search/page>1/already-filtered-to-them) since then
                            it's the only signal left. */}
                        {(discount || (featuredRailMode !== 'scoped' && featuredCompanyId !== null && product.companyId === featuredCompanyId)) && (
                          <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
                            {discount && (
                              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                                {discount.percentage}% OFF
                              </span>
                            )}
                            {featuredRailMode !== 'scoped' && featuredCompanyId !== null && product.companyId === featuredCompanyId && (
                              <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow-lg">
                                <Sparkles className="w-2.5 h-2.5" /> Featured Brand
                              </span>
                            )}
                          </div>
                        )}
                        <WishlistButton productId={product.id} />
                        <div className="absolute bottom-3 right-3 z-10 flex gap-2">
                          <QuickAddToCartButton
                            productId={product.id}
                            variantId={v?.id}
                          />
                          <QuickBuyNowButton
                            productId={product.id}
                            variantId={v?.id}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-lg line-clamp-2 text-zinc-900 dark:text-zinc-100">{product.productName}</h3>
                      {product.genericName && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">{product.genericName}</p>
                      )}

                      {/* Single variant (cheapest) with discount */}
                      {v && v.customerPrice && v.customerPrice > 10 ? (
                        <div className="pt-1">
                          {discount ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {currencySymbol} {discountedPrice.toLocaleString()}
                                </span>
                                <span className="text-sm text-zinc-500 line-through">
                                  {currencySymbol} {originalPrice.toLocaleString()}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-zinc-600 border-zinc-400/40 bg-white/60 dark:bg-zinc-900/60 w-fit">
                                {v.packingVolume || 'N/A'}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-green-700 border-green-600/40 bg-white/60 dark:bg-zinc-900/60">
                              {v.packingVolume || 'N/A'} – {currencySymbol} {v.customerPrice.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="pt-1">
                          <Badge variant="outline" className="text-orange-600 border-orange-400/40 bg-orange-50/60 dark:bg-orange-900/20">
                            Get Quote
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