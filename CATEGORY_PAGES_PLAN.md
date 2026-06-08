# Category Pages — Analysis, Report & Implementation Plan
**Generated:** 2026-06-07 | Active products: 111,826

---

## Table of Contents
1. [Raw Category Report — Top 100](#1-raw-category-report--top-100)
2. [Data Quality Findings](#2-data-quality-findings)
3. [Clean Category Tiers — What to Build](#3-clean-category-tiers--what-to-build)
4. [Product Coverage Estimates](#4-product-coverage-estimates)
5. [Implementation Plan](#5-implementation-plan)
6. [Slug Map — Tier 1 & 2 Categories](#6-slug-map--tier-1--2-categories)

---

## 1. Raw Category Report — Top 100

> Query: `SELECT category, COUNT(*) AS total ... GROUP BY category ORDER BY total DESC LIMIT 100`
> Run: 2026-06-07 | Time: 9.91 sec (no index on `(isActive, category)`)

| # | Category | Total | With Image | With Desc | With Variant | With Price |
|---|---|---|---|---|---|---|
| 1 | Uncategorized | 40,699 | 40,614 | 36,533 | 39,193 | 39,193 |
| 2 | Animals & Pet Supplies | 5,916 | 5,912 | 5,784 | 5,916 | 5,916 |
| 3 | Pets | 5,606 | 5,354 | 5,586 | 3,304 | 3,304 |
| 4 | Veterinary | 3,729 | 750 | 1,838 | 3,694 | 3,694 |
| 5 | Non-prescription Cat Food | 3,489 | 3,489 | 3,486 | 3,489 | 3,489 |
| 6 | Pet Collars & Harnesses | 2,576 | 2,576 | 2,570 | 2,576 | 2,576 |
| 7 | Non-prescription Dog Food | 2,319 | 2,319 | 2,315 | 2,319 | 2,319 |
| 8 | Dog Accessories | 2,155 | 2,154 | 2,119 | 2,155 | 2,155 |
| 9 | Dog Toys | 2,110 | 2,109 | 2,070 | 2,110 | 2,110 |
| 10 | Wet Food for Cats | 2,060 | 2,059 | 1,421 | 2,060 | 2,060 |
| 11 | Aquarium Fish Food | 1,982 | 1,982 | 1,982 | 1,890 | 1,890 |
| 12 | Pet Leashes | 1,727 | 1,727 | 1,727 | 1,727 | 1,727 |
| 13 | Dog Treats | 1,696 | 1,690 | 1,662 | 1,696 | 1,696 |
| 14 | Cat Food | 1,560 | 1,560 | 1,305 | 1,560 | 1,560 |
| 15 | Dog Apparel | 1,361 | 1,361 | 1,361 | 1,361 | 1,361 |
| 16 | Cat Treats | 1,273 | 1,273 | 1,177 | 1,273 | 1,273 |
| 17 | Poultry | 1,260 | 1,254 | 1,225 | 1,252 | 1,252 |
| 18 | Cat Dry Food | 1,227 | 1,227 | 1,086 | 1,227 | 1,227 |
| 19 | Dogs | 1,187 | 1,187 | 1,067 | 1,187 | 1,187 |
| 20 | Dog | 1,122 | 1,122 | 964 | 1,122 | 1,122 |
| 21 | Cat Toys | 1,117 | 1,116 | 1,039 | 1,117 | 1,117 |
| 22 | Cat | 1,034 | 1,034 | 892 | 1,034 | 1,034 |
| 23 | Dog Beds | 1,026 | 1,026 | 1,026 | 1,026 | 1,026 |
| 24 | CAT LITTER | 873 | 873 | 829 | 873 | 873 |
| 25 | Cats | 839 | 839 | 562 | 839 | 839 |
| 26 | Pet Bowls, Feeders & Waterers | 799 | 799 | 780 | 799 | 799 |
| 27 | AL | 791 | 772 | 681 | 791 | 791 |
| 28 | Bird Food | 773 | 773 | 771 | 773 | 773 |
| 29 | Walking Essentials | 735 | 735 | 684 | 735 | 735 |
| 30 | Dog Dry Food | 717 | 717 | 651 | 717 | 717 |
| 31 | Medicine | 678 | 544 | 594 | 678 | 678 |
| 32 | Aquariums | 665 | 665 | 665 | 665 | 665 |
| 33 | Shop | 634 | 634 | 253 | 454 | 454 |
| 34 | Pet Shampoo & Conditioner | 617 | 617 | 617 | 617 | 617 |
| 35 | Wet Cat Food | 552 | 552 | 481 | 552 | 552 |
| 36 | Dog Supplies & Tech | 524 | 524 | 524 | 524 | 524 |
| 37 | Leash | 518 | 518 | 518 | 518 | 518 |
| 38 | simple | 501 | 501 | 495 | 501 | 501 |
| 39 | Toys | 488 | 488 | 462 | 488 | 488 |
| 40 | Accessories | 484 | 483 | 167 | 484 | 484 |
| 41 | Pet Medicine | 477 | 477 | 477 | 477 | 477 |
| 42 | Harnesses, Collars & Leashes | 476 | 476 | 476 | 476 | 476 |
| 43 | Cat Food And Accessories | 475 | 475 | 368 | 475 | 475 |
| 44 | Dry Cat Food | 475 | 475 | 468 | 475 | 475 |
| 45 | Dog Leashes and Collars | 474 | 474 | 474 | 474 | 474 |
| 46 | Cat Wet Food | 460 | 460 | 457 | 460 | 460 |
| 47 | Fish Food | 454 | 446 | 448 | 454 | 454 |
| 48 | Cat Accessories | 437 | 437 | 350 | 437 | 437 |
| 49 | Cat Grooming Supplies | 430 | 430 | 311 | 430 | 430 |
| 50 | variable | 369 | 364 | 367 | 369 | 369 |
| 51 | Dry Dog Food | 365 | 362 | 359 | 365 | 365 |
| 52 | Bird Supplies | 361 | 361 | 358 | 361 | 361 |
| 53 | Food | 309 | 307 | 305 | 309 | 309 |
| 54 | Pet Supplies | 308 | 308 | 308 | 308 | 308 |
| 55 | Dog Food And Accessories | 293 | 293 | 188 | 293 | 293 |
| 56 | bowl | 280 | 280 | 280 | 280 | 280 |
| 57 | Dog Wet Food | 277 | 277 | 272 | 277 | 277 |
| 58 | Beds | 268 | 268 | 267 | 268 | 268 |
| 59 | Dog Food | 264 | 264 | 229 | 264 | 264 |
| 60 | harness | 261 | 261 | 261 | 261 | 261 |
| 61 | Cat Treat | 244 | 244 | 243 | 244 | 244 |
| 62 | All Products | 242 | 242 | 88 | 242 | 242 |
| 63 | Pet Accessories | 233 | 76 | 207 | 77 | 77 |
| 64 | Cat Shampoo | 232 | 232 | 202 | 232 | 232 |
| 65 | Pet Bed Accessories | 230 | 230 | 215 | 230 | 230 |
| 66 | Pet Grooming Supplies | 229 | 229 | 229 | 229 | 229 |
| 67 | Treats | 223 | 223 | 215 | 223 | 223 |
| 68 | Cat Beds | 222 | 222 | 203 | 222 | 222 |
| 69 | Aquarium Lighting | 222 | 222 | 222 | 222 | 222 |
| 70 | Wet Food | 215 | 215 | 204 | 215 | 215 |
| 71 | Adult Food | 204 | 203 | 149 | 204 | 204 |
| 72 | Food and Water Bowls | 198 | 198 | 198 | 198 | 198 |
| 73 | Pet Carriers & Crates | 193 | 193 | 191 | 193 | 193 |
| 74 | Health & Hygiene | 187 | 187 | 187 | 187 | 187 |
| 75 | Dog/Cat | 187 | 187 | 151 | 187 | 187 |
| 76 | Sheep | 185 | 177 | 185 | 185 | 185 |
| 77 | Cat/Dog Accessories | 185 | 185 | 179 | 185 | 185 |
| 78 | Dry Food | 183 | 182 | 176 | 183 | 183 |
| 79 | Dog Treat | 176 | 176 | 174 | 176 | 176 |
| 80 | Small Animal Food | 172 | 172 | 169 | 172 | 172 |
| 81 | null | 172 | 166 | 72 | 158 | 158 |
| 82 | Pet Supplement | 170 | 170 | 170 | 170 | 170 |
| 83 | Cat/Dog Travel Accessories | 170 | 170 | 170 | 170 | 170 |
| 84 | FLY PREVENTION | 169 | 169 | 169 | 169 | 169 |
| 85 | Cat Litter Boxes | 168 | 168 | 166 | 168 | 168 |
| 86 | Wet Dog Food | 167 | 167 | 163 | 167 | 167 |
| 87 | Aquarium Filters | 162 | 162 | 161 | 162 | 162 |
| 88 | Vitamin Supplements | 162 | 162 | 162 | 162 | 162 |
| 89 | cat-wet-food | 151 | 151 | 151 | 151 | 151 |
| 90 | Shampoo | 151 | 151 | 144 | 151 | 151 |
| 91 | Pet Grooming | 151 | 53 | 151 | 53 | 53 |
| 92 | BASIC | 147 | 147 | 125 | 147 | 147 |
| 93 | Supplements | 146 | 146 | 143 | 146 | 146 |
| 94 | Cat Furniture | 146 | 146 | 143 | 146 | 146 |
| 95 | Bird | 143 | 143 | 140 | 143 | 143 |
| 96 | Livestock Feed | 142 | 135 | 140 | 130 | 130 |
| 97 | Poop bags | 141 | 141 | 113 | 141 | 141 |
| 98 | Cat Pharmacy | 140 | 140 | 90 | 140 | 140 |
| 99 | Dog Kennel & Run Accessories | 137 | 137 | 137 | 137 | 137 |
| 100 | Grooming | 135 | 135 | 120 | 135 | 135 |

---

## 2. Data Quality Findings

### Finding 1 — "Uncategorized" is the Largest Single Category (40,699 products)

The string `"Uncategorized"` is stored in the `category` field for **36.4% of all categorized products**. These are products where no real category was assigned during import. They have images (40,614) and prices (39,193) but no meaningful taxonomy.

The existing `normalizeCategory()` function in `src/app/products/[id]/page.tsx` already treats `"uncategorized"` as generic (returns `"Veterinary Products"` fallback), but these products are still counted in the `category IS NOT NULL` branch of the sitemap, GMC feed, and all DB queries. A category page at `/category/uncategorized` would be worthless for SEO.

**Impact:** Removes 40,699 products from any category page. These products have no SEO category path and remain sitemap-only until their category is fixed in the DB.

### Finding 2 — 1,678 Distinct Categories; ~1,600 Are Junk

The query returned 1,678 distinct category values. The vast majority are:

| Junk type | Examples | Est. products |
|---|---|---|
| Product names used as category | "Alphacal-D", "AMIVICOM Inj.", "Alvegest Powder" | Thousands of 1-product categories |
| Ingredient lists | "Amoxicillin Trihydrate 200mg, Lincomycin HCl 88mg..." | ~500–1,000 products |
| GMC taxonomy paths | "Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Litter Boxes" | ~30–50 products |
| Internal codes | "AL", "BASIC", "simple", "variable" | ~1,800 products |
| Lowercase duplicates | "bowl", "harness", "cat-wet-food" | ~700 products |
| Literal "null" string | "null" | 172 products |
| Generic catch-alls | "Shop", "All Products", "Food", "Accessories" | ~1,800 products |

**A category page must only be created for categories that pass a quality filter.** Creating 1,678 pages would result in hundreds of thin, meaningless pages that hurt rather than help SEO.

### Finding 3 — Near-Duplicate Category Names (Data Fragmentation)

The same real-world category exists under multiple slightly different strings:

| Real category | DB variants | Total products |
|---|---|---|
| Dog food | "Dog Food", "Dog Dry Food", "Dry Dog Food", "Dog Wet Food", "Wet Dog Food", "Non-prescription Dog Food", "Dog Food And Accessories" | ~4,000+ |
| Cat food | "Cat Food", "Cat Dry Food", "Dry Cat Food", "Cat Wet Food", "Wet Cat Food", "Wet Food for Cats", "Non-prescription Cat Food", "cat-wet-food" | ~11,000+ |
| Dog | "Dog", "Dogs" | 2,309 |
| Cat | "Cat", "Cats" | 1,873 |
| Cat litter | "CAT LITTER", "Cat Litter Boxes" | 1,041 |
| Leashes | "Pet Leashes", "Leash", "Dog Leashes and Collars", "Harnesses, Collars & Leashes" | 2,995 |
| Treats | "Dog Treats", "Cat Treats", "Dog Treat", "Cat Treat", "Treats" | 3,612 |

These duplicates exist because data was imported from multiple sources (scrapers, manual entry, different suppliers) with no category normalization. **Category pages will be built per distinct DB string, not consolidated** — consolidation requires a DB migration and is out of scope for phase 1.

### Finding 4 — "Veterinary" Has 2,979 Products Without Images

The Veterinary category (3,729 total) has only 750 with images — **79.9% lack images**. This is the highest image-gap ratio of any large category. A Veterinary category page would show mostly imageless product cards, degrading the user and crawler experience.

| Category | Total | With Image | Image Gap % |
|---|---|---|---|
| Veterinary | 3,729 | 750 | **79.9% missing** |
| Pet Accessories | 233 | 76 | 67.4% missing |
| Pet Grooming | 151 | 53 | 64.9% missing |
| Medicine | 678 | 544 | 19.8% missing |
| Pets | 5,606 | 5,354 | 4.5% missing |

### Finding 5 — "Animals & Pet Supplies" Is a GMC Taxonomy Path Used as a Category

5,916 products have `category = "Animals & Pet Supplies"`. This is the Google Merchant Center taxonomy path being stored verbatim in the category field. The page would be titled "Animals & Pet Supplies Products" which is confusing UX and weak as a keyword target. It should be built but with a display label override: **"Pet Supplies"**.

### Finding 6 — "AL" Is a Store Code, Not a Category (791 products)

"AL" appears to be an internal abbreviation for a specific supplier or store. Its subcategories (from Query 4) are real and meaningful: "Aquariums - Cabinets & Stands", "Cat Leashes-Collar & Harnesses", "Fish Heating & Lighting", etc. The `subCategory` values are the real categories here but the top-level `category = "AL"` is meaningless for a page URL. **Skip "AL" for category pages.**

---

## 3. Clean Category Tiers — What to Build

### Blocked Categories (never create a page)

```typescript
// src/lib/category-utils.ts
export const BLOCKED_CATEGORIES = new Set([
  'Uncategorized', 'uncategorized',
  'null', 'NULL',
  'simple', 'variable', 'BASIC',
  'AL', 'al',
  'Shop', 'All Products',
  'Food',          // too generic, overlaps with 15 other food categories
  'bowl',          // lowercase junk
  'harness',       // lowercase junk
  'cat-wet-food',  // slug-format duplicate of "Cat Wet Food"
  'Dog/Cat',       // slash makes slug ambiguous
  'Cat/Dog Accessories',
  'Cat/Dog Travel Accessories',
])
```

### Tier 1 — Build First (>500 clean products, high search volume keywords)

| Display Label | DB category value | Slug | Products | Image % | Price % |
|---|---|---|---|---|---|
| Pet Supplies | Animals & Pet Supplies | `pet-supplies` | 5,916 | 99.9% | 100% |
| Pets | Pets | `pets` | 5,606 | 95.5% | 58.9% |
| Non-Prescription Cat Food | Non-prescription Cat Food | `non-prescription-cat-food` | 3,489 | 100% | 100% |
| Pet Collars & Harnesses | Pet Collars & Harnesses | `pet-collars-harnesses` | 2,576 | 100% | 100% |
| Non-Prescription Dog Food | Non-prescription Dog Food | `non-prescription-dog-food` | 2,319 | 100% | 100% |
| Dog Accessories | Dog Accessories | `dog-accessories` | 2,155 | 99.9% | 100% |
| Dog Toys | Dog Toys | `dog-toys` | 2,110 | 99.9% | 100% |
| Wet Cat Food | Wet Food for Cats | `wet-food-for-cats` | 2,060 | 99.9% | 100% |
| Aquarium Fish Food | Aquarium Fish Food | `aquarium-fish-food` | 1,982 | 100% | 95.4% |
| Pet Leashes | Pet Leashes | `pet-leashes` | 1,727 | 100% | 100% |
| Dog Treats | Dog Treats | `dog-treats` | 1,696 | 99.6% | 100% |
| Cat Food | Cat Food | `cat-food` | 1,560 | 100% | 100% |
| Dog Apparel | Dog Apparel | `dog-apparel` | 1,361 | 100% | 100% |
| Cat Treats | Cat Treats | `cat-treats` | 1,273 | 100% | 100% |
| Poultry Products | Poultry | `poultry` | 1,260 | 99.5% | 99.4% |
| Cat Dry Food | Cat Dry Food | `cat-dry-food` | 1,227 | 100% | 100% |
| Dogs | Dogs | `dogs` | 1,187 | 100% | 100% |
| Cat Toys | Cat Toys | `cat-toys` | 1,117 | 99.9% | 100% |
| Dog Beds | Dog Beds | `dog-beds` | 1,026 | 100% | 100% |
| Cat Litter | CAT LITTER | `cat-litter` | 873 | 100% | 100% |
| Cats | Cats | `cats` | 839 | 100% | 100% |
| Pet Bowls & Feeders | Pet Bowls, Feeders & Waterers | `pet-bowls-feeders-waterers` | 799 | 100% | 100% |
| Bird Food | Bird Food | `bird-food` | 773 | 100% | 100% |
| Walking Essentials | Walking Essentials | `walking-essentials` | 735 | 100% | 100% |
| Dog Dry Food | Dog Dry Food | `dog-dry-food` | 717 | 100% | 100% |
| Aquariums | Aquariums | `aquariums` | 665 | 100% | 100% |
| Pet Shampoo & Conditioner | Pet Shampoo & Conditioner | `pet-shampoo-conditioner` | 617 | 100% | 100% |
| Wet Cat Food (2) | Wet Cat Food | `wet-cat-food` | 552 | 100% | 100% |
| Dog Supplies & Tech | Dog Supplies & Tech | `dog-supplies-tech` | 524 | 100% | 100% |

**Tier 1 total: 29 pages covering ~40,000+ products**

### Tier 2 — Build in Week 2 (100–500 products, specific keywords)

| Display Label | DB category value | Slug | Products |
|---|---|---|---|
| Veterinary | Veterinary | `veterinary` | 3,729 |
| Dog | Dog | `dog` | 1,122 |
| Cat | Cat | `cat` | 1,034 |
| Cat Accessories | Cat Accessories | `cat-accessories` | 437 |
| Cat Grooming Supplies | Cat Grooming Supplies | `cat-grooming-supplies` | 430 |
| Pet Toys | Toys | `toys` | 488 |
| Pet Medicine | Pet Medicine | `pet-medicine` | 477 |
| Harnesses, Collars & Leashes | Harnesses, Collars & Leashes | `harnesses-collars-leashes` | 476 |
| Cat Food & Accessories | Cat Food And Accessories | `cat-food-and-accessories` | 475 |
| Dry Cat Food | Dry Cat Food | `dry-cat-food` | 475 |
| Dog Leashes & Collars | Dog Leashes and Collars | `dog-leashes-and-collars` | 474 |
| Fish Food | Fish Food | `fish-food` | 454 |
| Dry Dog Food | Dry Dog Food | `dry-dog-food` | 365 |
| Bird Supplies | Bird Supplies | `bird-supplies` | 361 |
| Pet Supplies | Pet Supplies | `pet-supplies-2` | 308 |
| Dog Food | Dog Food | `dog-food` | 264 |
| Cat Shampoo | Cat Shampoo | `cat-shampoo` | 232 |
| Pet Bed Accessories | Pet Bed Accessories | `pet-bed-accessories` | 230 |
| Pet Grooming Supplies | Pet Grooming Supplies | `pet-grooming-supplies` | 229 |
| Cat Beds | Cat Beds | `cat-beds` | 222 |
| Aquarium Lighting | Aquarium Lighting | `aquarium-lighting` | 222 |
| Food & Water Bowls | Food and Water Bowls | `food-and-water-bowls` | 198 |
| Pet Carriers & Crates | Pet Carriers & Crates | `pet-carriers-crates` | 193 |
| Health & Hygiene | Health & Hygiene | `health-hygiene` | 187 |
| Sheep Products | Sheep | `sheep` | 185 |
| Small Animal Food | Small Animal Food | `small-animal-food` | 172 |
| Pet Supplements | Pet Supplement | `pet-supplement` | 170 |
| Fly Prevention | FLY PREVENTION | `fly-prevention` | 169 |
| Cat Litter Boxes | Cat Litter Boxes | `cat-litter-boxes` | 168 |
| Wet Dog Food | Wet Dog Food | `wet-dog-food` | 167 |
| Aquarium Filters | Aquarium Filters | `aquarium-filters` | 162 |
| Vitamin Supplements | Vitamin Supplements | `vitamin-supplements` | 162 |
| Grooming | Grooming | `grooming` | 135 |
| Dog Kennel & Run | Dog Kennel & Run Accessories | `dog-kennel-run-accessories` | 137 |
| Cat Pharmacy | Cat Pharmacy | `cat-pharmacy` | 140 |
| Livestock Feed | Livestock Feed | `livestock-feed` | 142 |
| Cat Furniture | Cat Furniture | `cat-furniture` | 146 |
| Supplements | Supplements | `supplements` | 146 |

**Tier 2 total: ~38 more pages covering ~12,000+ additional products**

### Skip for Now (data quality too poor for meaningful pages)

| Category | Reason |
|---|---|
| Veterinary (image quality) | 79.9% without images — poor visual page |
| Medicine | 19.8% without images; "Medicine" is too generic |
| Dog Wet Food / Dog Food And Accessories | Overlap with other food categories |
| Adult Food | Generic, overlaps with multiple food categories |
| Accessories | 167/484 with description — thin content |
| Pet Accessories | Only 76/233 have images (32.7%) |
| Pet Grooming | Only 53/151 have images (35.1%) |

---

## 4. Product Coverage Estimates

```
Total active products:                           111,826

Products with category set:                      104,171  (93.2%)
  └── "Uncategorized" string (not useful):        40,699
  └── Junk categories (AL, simple, etc.):          ~3,800
  └── Single-product categories (1,500+ variants): ~8,000
  └── Products with real, usable categories:      ~51,672

Tier 1 pages (29 categories):                    ~40,000  (35.8% of catalog)
Tier 2 pages (+38 categories):                   ~52,000  (46.5% of catalog)
Combined Tier 1+2 (67 pages):                    ~52,000  products gain a crawlable HTML link

Still sitemap-only after category pages:
  Uncategorized (40,699) + junk + orphaned        ~59,826  (53.5%)
```

### Why This Still Wins

Even with only ~52,000 products covered by category pages:
- **Every product with a category** gets its breadcrumb link converted from a non-crawlable JS-filter URL to a real server-rendered page
- **67 new indexable pages** target specific commercial keywords ("dog toys Pakistan", "cat food buy online", etc.)
- **Category pages cluster products** — Google can crawl the full category in 1–10 paginated pages vs scanning 109k sitemap entries
- **Internal PageRank flows** from category pages to product pages, replacing the current dead-end where 95% of products have zero inbound links

---

## 5. Implementation Plan

### Phase 1 — Foundation (do in one PR)

#### File 1: `src/lib/category-utils.ts` (NEW)

```typescript
// Functions to implement (in this order):

// 1. Slug generator
export function toSlug(category: string): string
// "Wet Food for Cats" → "wet-food-for-cats"
// "CAT LITTER"        → "cat-litter"
// "Pet Bowls, Feeders & Waterers" → "pet-bowls-feeders-waterers"
// Rule: .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// 2. Display label override (for ugly category names like "Animals & Pet Supplies")
export const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  'Animals & Pet Supplies': 'Pet Supplies',
  'CAT LITTER': 'Cat Litter',
  'Wet Food for Cats': 'Wet Cat Food',
  'FLY PREVENTION': 'Fly Prevention',
  'Non-prescription Cat Food': 'Non-Prescription Cat Food',
  'Non-prescription Dog Food': 'Non-Prescription Dog Food',
  // add more as needed
}

// 3. Blocked category filter
export const BLOCKED_CATEGORIES = new Set([...])  // see Section 3

// 4. DB query — all valid categories with counts (cached 1 hour via unstable_cache)
export async function getAllCategories(): Promise<CategoryEntry[]>
// SELECT category, COUNT(*) ... GROUP BY category ORDER BY total DESC
// Filters out BLOCKED_CATEGORIES and categories with count < 10

// 5. Reverse lookup: slug → DB category string
export async function slugToCategory(slug: string): Promise<string | null>

// 6. Static params for generateStaticParams
export async function getCategoryStaticParams(): Promise<{ slug: string }[]>
```

#### File 2: `src/app/category/[slug]/page.tsx` (NEW)

Key elements:
```
- generateStaticParams()       → pre-builds all Tier 1 pages at deploy time
- generateMetadata()           → title, description, canonical, OG
- export const revalidate = 3600
- Server component only — no 'use client'
- Fetches: category products (paginated, 48/page) + total count
- Renders: breadcrumb, H1, product grid, pagination, JSON-LD (ItemList + BreadcrumbList)
- On not found slug: notFound()
```

**Metadata:**
```
title:       "{DisplayLabel} Products | Buy Online - Animal Wellness"
description: "Browse {count} {displayLabel} products at Animal Wellness.
              Best prices in Pakistan. Fast nationwide delivery."
canonical:   "https://animalwellness.shop/category/{slug}"
             (ALL paginated pages point canonical → page 1)
```

**JSON-LD:**
```json
[
  {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "position": 1, "name": "Home", "item": "https://animalwellness.shop" },
      { "position": 2, "name": "{DisplayLabel}", "item": "https://animalwellness.shop/category/{slug}" }
    ]
  },
  {
    "@type": "ItemList",
    "name": "{DisplayLabel} Products",
    "numberOfItems": 48,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "url": "https://animalwellness.shop/products/123" },
      ...
    ]
  }
]
```

**Pagination (query-param style):**
```
/category/dog-toys         → page 1  (canonical: same)
/category/dog-toys?page=2  → page 2  (canonical: /category/dog-toys)
/category/dog-toys?page=3  → page 3  (canonical: /category/dog-toys)

<link rel="next"> and <link rel="prev"> in head
```

**Product sort order:** `isFeatured DESC, id DESC` (same as listing page — prioritises featured and newest)

#### File 3: `src/app/category/page.tsx` (NEW) — Category Index

```
URL: /category
Title: "Browse All Product Categories | Animal Wellness"
Content: Grid of all valid categories with product count badges
Links to: /category/{slug} for each
Sitemap: included in sitemap/0.xml at priority 0.8
```

#### Modified: `src/app/products/[id]/page.tsx`

**Change breadcrumb href** (2 locations — lines ~296 and ~341):
```typescript
// BEFORE:
href={`/products?category=${encodeURIComponent(data.category || '')}`}

// AFTER:
import { toSlug } from '@/lib/category-utils'
href={`/category/${toSlug(data.category || '')}`}
```

Also update the breadcrumb JSON-LD `item` field at line ~296 to use `/category/{slug}`.

**Important:** Only change the href when the category is NOT blocked. If `BLOCKED_CATEGORIES.has(data.category)`, keep the breadcrumb but remove the link (render it as plain text, not an anchor). This avoids linking to 404 pages from 40,699 "Uncategorized" products.

#### Modified: `src/app/sitemap/[id]/route.ts`

Add to `buildNonProductSitemap()`:
```typescript
const categories = await prisma.product.groupBy({
  by: ['category'],
  where: { isActive: true, category: { not: null } },
  _count: { id: true },
  having: { id: { _count: { gte: 10 } } },
  orderBy: { _count: { id: 'desc' } },
})

const categoryPages = categories
  .filter(c => c.category && !BLOCKED_CATEGORIES.has(c.category))
  .map(c => ({
    url: `${BASE_URL}/category/${toSlug(c.category!)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))
```

### Phase 2 — Polish (next PR after phase 1 is indexed)

1. **Add `@@index([isActive, category])` to Prisma schema** — speeds up all category queries from O(N) scan to O(1) lookup
2. **Category page: "Related Categories" section** — show 4–6 sibling categories at page bottom to improve crawl graph
3. **Homepage: category grid widget** — visible links to top 12 categories, increases crawl discovery speed
4. **Category page: sort/filter UI** — client component for price/brand filtering (doesn't affect SEO, improves UX)

---

## 6. Slug Map — Tier 1 & 2 Categories

Final slug resolution for all 67 planned categories. These are deterministic outputs of `toSlug()`:

| DB category string | Slug | Display label |
|---|---|---|
| Animals & Pet Supplies | `animals-pet-supplies` | Pet Supplies |
| Pets | `pets` | Pets |
| Veterinary | `veterinary` | Veterinary Products |
| Non-prescription Cat Food | `non-prescription-cat-food` | Non-Prescription Cat Food |
| Pet Collars & Harnesses | `pet-collars-harnesses` | Pet Collars & Harnesses |
| Non-prescription Dog Food | `non-prescription-dog-food` | Non-Prescription Dog Food |
| Dog Accessories | `dog-accessories` | Dog Accessories |
| Dog Toys | `dog-toys` | Dog Toys |
| Wet Food for Cats | `wet-food-for-cats` | Wet Cat Food |
| Aquarium Fish Food | `aquarium-fish-food` | Aquarium Fish Food |
| Pet Leashes | `pet-leashes` | Pet Leashes |
| Dog Treats | `dog-treats` | Dog Treats |
| Cat Food | `cat-food` | Cat Food |
| Dog Apparel | `dog-apparel` | Dog Apparel |
| Cat Treats | `cat-treats` | Cat Treats |
| Poultry | `poultry` | Poultry Products |
| Cat Dry Food | `cat-dry-food` | Cat Dry Food |
| Dogs | `dogs` | Dogs |
| Dog | `dog` | Dog Products |
| Cat Toys | `cat-toys` | Cat Toys |
| Cat | `cat` | Cat Products |
| Dog Beds | `dog-beds` | Dog Beds |
| CAT LITTER | `cat-litter` | Cat Litter |
| Cats | `cats` | Cats |
| Pet Bowls, Feeders & Waterers | `pet-bowls-feeders-waterers` | Pet Bowls & Feeders |
| Bird Food | `bird-food` | Bird Food |
| Walking Essentials | `walking-essentials` | Walking Essentials |
| Dog Dry Food | `dog-dry-food` | Dog Dry Food |
| Medicine | `medicine` | Pet Medicine |
| Aquariums | `aquariums` | Aquariums |
| Pet Shampoo & Conditioner | `pet-shampoo-conditioner` | Pet Shampoo & Conditioner |
| Wet Cat Food | `wet-cat-food` | Wet Cat Food |
| Dog Supplies & Tech | `dog-supplies-tech` | Dog Supplies & Tech |
| Leash | `leash` | Dog Leashes |
| Toys | `toys` | Pet Toys |
| Pet Medicine | `pet-medicine` | Pet Medicine |
| Harnesses, Collars & Leashes | `harnesses-collars-leashes` | Harnesses, Collars & Leashes |
| Cat Food And Accessories | `cat-food-and-accessories` | Cat Food & Accessories |
| Dry Cat Food | `dry-cat-food` | Dry Cat Food |
| Dog Leashes and Collars | `dog-leashes-and-collars` | Dog Leashes & Collars |
| Cat Wet Food | `cat-wet-food` | Cat Wet Food |
| Fish Food | `fish-food` | Fish Food |
| Cat Accessories | `cat-accessories` | Cat Accessories |
| Cat Grooming Supplies | `cat-grooming-supplies` | Cat Grooming Supplies |
| Dry Dog Food | `dry-dog-food` | Dry Dog Food |
| Bird Supplies | `bird-supplies` | Bird Supplies |
| Pet Supplies | `pet-supplies` | Pet Supplies |
| Dog Wet Food | `dog-wet-food` | Dog Wet Food |
| Beds | `beds` | Pet Beds |
| Dog Food | `dog-food` | Dog Food |
| Cat Treat | `cat-treat` | Cat Treats |
| Cat Shampoo | `cat-shampoo` | Cat Shampoo |
| Pet Bed Accessories | `pet-bed-accessories` | Pet Bed Accessories |
| Pet Grooming Supplies | `pet-grooming-supplies` | Pet Grooming Supplies |
| Treats | `treats` | Pet Treats |
| Cat Beds | `cat-beds` | Cat Beds |
| Aquarium Lighting | `aquarium-lighting` | Aquarium Lighting |
| Food and Water Bowls | `food-and-water-bowls` | Food & Water Bowls |
| Pet Carriers & Crates | `pet-carriers-crates` | Pet Carriers & Crates |
| Health & Hygiene | `health-hygiene` | Health & Hygiene |
| Sheep | `sheep` | Sheep Products |
| Small Animal Food | `small-animal-food` | Small Animal Food |
| Pet Supplement | `pet-supplement` | Pet Supplements |
| FLY PREVENTION | `fly-prevention` | Fly Prevention |
| Cat Litter Boxes | `cat-litter-boxes` | Cat Litter Boxes |
| Wet Dog Food | `wet-dog-food` | Wet Dog Food |
| Aquarium Filters | `aquarium-filters` | Aquarium Filters |
| Vitamin Supplements | `vitamin-supplements` | Vitamin Supplements |
| Livestock Feed | `livestock-feed` | Livestock Feed |
| Cat Furniture | `cat-furniture` | Cat Furniture |
| Supplements | `supplements` | Supplements |
| Bird | `bird` | Bird Products |
| Poop bags | `poop-bags` | Dog Poop Bags |
| Cat Pharmacy | `cat-pharmacy` | Cat Pharmacy |
| Dog Kennel & Run Accessories | `dog-kennel-run-accessories` | Dog Kennel & Run |
| Grooming | `grooming` | Pet Grooming |

**Slug collision check:** No two DB category strings in this list produce the same slug. `toSlug()` is injective for this dataset. ✓

---

*Ready to implement. Confirm to proceed with Phase 1 (category-utils.ts + category page + breadcrumb fix + sitemap update).*
