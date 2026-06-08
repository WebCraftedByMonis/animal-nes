# Animal Wellness — Complete Architecture Audit
**SEO · Indexing · Google Merchant Center · Product Discovery**
> Generated: 2026-06-07 | Active products: 111,826

---

## Table of Contents
1. [Product Architecture](#1-product-architecture)
2. [Product Page Generation](#2-product-page-generation)
3. [Sitemap Architecture](#3-sitemap-architecture)
4. [Google Merchant Center Feed](#4-google-merchant-center-feed)
5. [Indexing Quality Analysis](#5-indexing-quality-analysis)
6. [Internal Linking System](#6-internal-linking-system)
7. [Category & Brand SEO](#7-category--brand-seo)
8. [Revenue-First Opportunities](#8-revenue-first-opportunities)

---

## 1. Product Architecture

### Database Table: `Product`
**File:** `prisma/schema.prisma` lines 31–64

```
Product
├── id              Int      PK, autoincrement
├── productName     String   TEXT — REQUIRED
├── genericName     String?  TEXT — optional
├── category        String?  TEXT — optional  ← critical SEO gap
├── subCategory     String?  TEXT — optional
├── subsubCategory  String?  TEXT — optional
├── productType     String?  TEXT — optional
├── companyId       Int      FK → Company — REQUIRED
├── partnerId       Int      FK → Partner — REQUIRED
├── description     String?  TEXT — optional  ← critical SEO gap
├── productLink     String?  TEXT — optional
├── dosage          String?  TEXT — optional
├── outofstock      Boolean  default false
├── isFeatured      Boolean  default false
├── isActive        Boolean  default FALSE    ← default is OFF
├── createdAt       DateTime
└── updatedAt       DateTime
```

**Critical observation:** `isActive` defaults to `false`. Every scraped/imported product must be explicitly activated before it appears in the sitemap or GMC feed. The `category`, `description`, `genericName`, and `dosage` fields are all nullable — no database-level enforcement of content quality.

### Related Tables

| Table | Relationship | Key fields | Optional? |
|---|---|---|---|
| `ProductVariant` | 1:many via `productId` | `packingVolume`, `customerPrice`, `companyPrice`, `dealerPrice`, `inventory` | Entire relation optional |
| `ProductImage` | 1:1 via `productId @unique` | `url`, `alt`, `publicId` | Optional |
| `ProductPdf` | 1:1 via `productId @unique` | `url`, `publicId` | Optional |
| `Company` | many:1 via `companyId` | `companyName`, `country`, `email` | Required FK, but fields nullable |
| `Partner` | many:1 via `partnerId` | `partnerName`, `partnerType` | Required FK, but fields nullable |
| `ProductReview` | 1:many | `rating`, `comment`, `isApproved` | Optional |
| `Discount` | 1:many | `percentage`, `startDate`, `endDate` | Optional |

**There is no standalone `Category` model, no `Brand` model, and no `Tag` model.** Category is a free-text string field directly on `Product`. This means:
- No canonical category pages can be generated from a category table
- No enforced category taxonomy (same category appears as "Veterinary", "veterinary", "VETERINARY")
- No brand entity separate from `Company`

### Required vs Optional Summary

| Field | Required | SEO-critical |
|---|---|---|
| `productName` | YES | YES |
| `companyId` / `partnerId` | YES (FK) | Moderate |
| `category` | NO | YES — drives breadcrumbs, related products, GMC category |
| `description` | NO | YES — drives meta descriptions and GMC feed |
| `image` (relation) | NO | YES — drives GMC inclusion, OG tags, structured data |
| `variants[].customerPrice` | NO | YES — drives Offers schema, GMC price, SERP price display |
| `genericName` | NO | Moderate — used as `g:mpn` in GMC feed |
| `isActive` | default=false | YES — gates sitemap + feed inclusion entirely |

### Missing Database Index (Performance-Critical)

There is **no compound index on `(isActive, id)`** in `prisma/schema.prisma`. Every sitemap child query and GMC feed query does a full-table scan across 111,826+ rows. To fix:

```prisma
// In prisma/schema.prisma, inside the Product model:
@@index([isActive, id])
```

```sql
-- Or directly on the VPS:
ALTER TABLE Product ADD INDEX idx_sitemap (isActive, id);
```

---

## 2. Product Page Generation

### Route
```
src/app/products/[id]/page.tsx
URL:        /products/{id}
Rendering:  ISR — export const revalidate = 1800 (30-minute cache)
```

### Metadata Generation
**File:** `src/app/products/[id]/page.tsx` lines 111–171

```typescript
// Title (always this exact pattern):
`${data.productName} | Buy Online - Animal Wellness`

// Meta description — conditional:
// IF description exists: first 155 chars
rawDesc.replace(/\s+/g, ' ').trim().slice(0, 155) + '…'

// ELSE fallback (generic, identical pattern for all no-desc products):
`Buy ${data.productName} — ${normalizedCat}${price ? ` from PKR ${price}` : ''}. Fast delivery across Pakistan.`
```

### Canonical URL
**File:** `src/app/products/[id]/page.tsx` line 166
```typescript
alternates: { canonical: `/products/${id}` }
// Resolved by Next.js metadataBase → https://animalwellness.shop/products/{id}
```

### OpenGraph Tags
**File:** `src/app/products/[id]/page.tsx` lines 157–165
```typescript
openGraph: {
  title: `${data.productName} - Buy Online`,
  description: metaDescription,
  images: data.image ? [{ url: data.image.url, width: 800, height: 600 }] : [],
  type: 'website',   // ← BUG: should be 'product' for e-commerce
  siteName: 'Animal Wellness',
}
```
**Issue:** `og:type: 'website'` disables Facebook/Instagram Shopping and Pinterest Product Pin integration. Should be `'product'`.

### Structured Data (JSON-LD)
**File:** `src/app/products/[id]/page.tsx` lines 232–307

**Schema 1 — Product:**
```
@type: Product
name:             productName
description:      data.description || fallback string
image:            data.image?.url         ← CONDITIONAL (omitted if no image)
brand:            company.companyName || "Animal Wellness"
manufacturer:     company.companyName || "Animal Wellness"
category:         normalizedCategory
aggregateRating:  ← CONDITIONAL (only if isApproved reviews exist)
offers (AggregateOffer):
  lowPrice, highPrice, priceCurrency: PKR
  availability: InStock / OutOfStock
  offerCount: variants.length
  ← ENTIRE BLOCK ABSENT if variants.length === 0
```

**Schema 2 — BreadcrumbList:**
```
Home → Products → [Category?] → ProductName
Category step omitted if category is null or generic
```

**Structured data degradation by product state:**

| Condition | Schema impact |
|---|---|
| No image | `image` field missing — no image carousel eligibility in Google |
| No variants | `offers` block entirely absent — no price rich result |
| No reviews | `aggregateRating` absent — no star ratings |
| Null category | Breadcrumb stays at 3 steps, no category-level link |
| Description < 20 chars | GMC uses constructed fallback description |

### Duplicate Boilerplate Content (Thin Content Risk)
Every one of the 111,826 product pages renders:
- **5 identical FAQ items** — hardcoded, ~230 words, identical across all pages
- **5 identical Shipping Info rows** — hardcoded, ~30 words, identical across all pages

This boilerplate accounts for the majority of the word count on low-content products (those with no description or short description), making these pages appear as duplicate/thin content to Google.

### Related Products
**File:** `src/app/products/[id]/page.tsx` lines 199–211
```typescript
prisma.product.findMany({
  where: { category: data.category, isActive: true, id: { not: numId } },
  take: 4,
  orderBy: { id: 'desc' },
})
// Only runs if category is non-null and non-generic
```
- Max 4 outbound product links per page
- Entirely absent for products with null/generic category
- `orderBy: { id: 'desc' }` always returns the same 4 newest products in that category

---

## 3. Sitemap Architecture

### Sitemap Index
**File:** `src/app/sitemap.xml/route.ts`

```
Route:    GET /sitemap.xml
Caching:  force-dynamic + Cache-Control: public, max-age=3600, s-maxage=3600

Logic:
  1. COUNT(Product WHERE isActive=true) → 111,826
  2. chunks = Math.ceil(111826 / 5000) = 23
  3. ids = [0, 1, 2, ..., 23]  → 24 sitemaps total
  4. Emits <sitemapindex> with 24 <sitemap><loc> entries

⚠ No <lastmod> on any <sitemap> entry in the index
⚠ force-dynamic means every GSC fetch regenerates from DB with no cache
```

### Child Sitemap: sitemap/0.xml — Non-Product Pages
**File:** `src/app/sitemap/[id]/route.ts` lines 47–171
```
Contents: 19 static pages + all partners + all companies + active news
          + all job forms + all job posts + accepted sell animals + active dynamic forms

⚠ All 19 static pages use lastmod = new Date() (current timestamp on every request)
  → Google loses trust in lastmod accuracy site-wide
⚠ No LIMIT on any query — unbounded growth as DB grows
```

### Child Sitemaps: sitemap/1.xml through sitemap/23.xml — Product Pages
**File:** `src/app/sitemap/[id]/route.ts` lines 173–188

```typescript
async function buildProductSitemap(id: number): Promise<Entry[]> {
  const skip = (id - 1) * PRODUCTS_PER_SITEMAP;  // e.g. sitemap/23 → skip 110,000
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
    skip,
    take: 5000,
    orderBy: { id: 'asc' },
  });
  // ...
}
```

**Performance problem:** `skip`-offset pagination forces MySQL to scan ALL preceding rows:
- `sitemap/1.xml` → scan 0 rows before returning 5,000
- `sitemap/23.xml` → scan 110,000 rows before returning 5,000
- No compound index on `(isActive, id)` exists → full table scan each time
- Under concurrent Googlebot crawl of 23 sitemaps, DB load is multiplicative

**Fix — cursor-based pagination:**
```typescript
// Replace skip/take with cursor after first page:
const lastId = id === 1 ? 0 : (id - 1) * 5000; // approximate; store real cursor
prisma.product.findMany({
  where: { isActive: true, id: { gt: lastCursorId } },
  orderBy: { id: 'asc' },
  take: 5000,
})
// This is O(1) index seek instead of O(N) scan, requires @@index([isActive, id])
```

### Format Violations

| Violation | Location | Impact |
|---|---|---|
| `<priority>1</priority>` instead of `<priority>1.0</priority>` | `toXml()` line 28 — `(1.0).toString()` = `"1"` | Minor; some validators flag it |
| No `<lastmod>` on `<sitemap>` entries | `sitemap.xml/route.ts` | GSC can't determine freshness of index |
| Static page `lastmod = now` on every request | `sitemap/[id]/route.ts` line 48 | Google stops trusting lastmod values |
| `force-dynamic` with no server-side cache | Both route files | Every GSC crawl hits the DB cold |
| Potential timeout on high-offset sitemaps | `buildProductSitemap` | GSC marks sitemap as "couldn't fetch" |

### Inclusion/Exclusion Filters

| Filter | Effect |
|---|---|
| `isActive: true` | Only active products. Currently 111,826 included. |
| No image filter | Products without images ARE in sitemap |
| No description filter | Products with empty descriptions ARE in sitemap |
| No price/variant filter | Products with no variants ARE in sitemap |
| No category filter | Products with null category ARE in sitemap |

---

## 4. Google Merchant Center Feed

### Feed Route
**File:** `src/app/products-feed.xml/route.ts`

```
URL:      GET /products-feed.xml?platform=google&country=PK
          GET /products-feed.xml?platform=google&country=AE
          GET /products-feed.xml?platform=meta&country=PK
          GET /products-feed.xml?platform=meta&country=AE

Caching:  force-dynamic + Cache-Control: public, max-age=3600
Output:   RSS 2.0 with xmlns:g="http://base.google.com/ns/1.0"
Delivery: Streaming ReadableStream (correct — avoids memory ceiling)
```

### Product Inclusion Criteria
```typescript
// The ONLY filter applied to the DB query:
where: { isActive: true }

// Products WITHOUT images are fetched but silently dropped in buildGoogleItem():
if (!rawImageUrl) return "";

// Google feed: products WITHOUT price ARE included (g:price tag omitted → GMC disapproval)
// Meta feed:   products WITHOUT price ARE excluded (explicit early return line 191)
```

### DB → Feed Field Mapping

| GMC Field | Source | Fallback |
|---|---|---|
| `g:id` | `{productId}-{variantId}` | `{productId}` if no variant id |
| `g:title` | `productName + packingVolume` | `productName` only |
| `g:description` | `description` if > 20 chars | Constructed: `"ProductName — Generic: X. Category: Y. Form: Z."` |
| `g:link` | `/products/{id}` | — |
| `g:image_link` | `image.url` (HTTPS enforced) | **Product skipped entirely if null** |
| `g:availability` | `outofstock` Boolean | `"in stock"` / `"out of stock"` |
| `g:price` | `variant.customerPrice + currency` | Omitted if null → GMC disapproval |
| `g:condition` | Hardcoded `"new"` | — |
| `g:brand` | `company.companyName \|\| partner.partnerName \|\| "Animal Wellness"` | — |
| `g:identifier_exists` | Hardcoded `"no"` | — |
| `g:mpn` | `genericName` | Omitted if null |
| `g:product_type` | `category > subCategory > subsubCategory` | Omitted if all null |
| `g:google_product_category` | `GOOGLE_CATEGORY_MAP[category]` | `"Animals & Pet Supplies > Pet Supplies"` |
| `g:size` | `packingVolume` | Omitted |
| `g:item_group_id` | `productId` | Only emitted when product has multiple variants |

### Google Product Category Map
**File:** `src/app/products-feed.xml/route.ts` lines 10–20

Only 9 categories are mapped. All others — and any product whose `category` field doesn't exactly match one of these 9 strings — receive the generic fallback:

```
"Animals & Pet Supplies > Pet Supplies"
```

Since category is free-text with no enforcement, the vast majority of products fall through to the generic category.

### Reasons a Product Gets Disapproved in GMC

| Reason | Root cause |
|---|---|
| Missing image | `image: null` → product silently dropped from feed |
| Missing price | All `customerPrice: null` → `<g:price>` omitted → GMC required attribute error |
| Generic/short description | ≤ 20 chars → constructed fallback → GMC "description too short" |
| Wrong category | Free-text mismatch → always falls to generic fallback |
| Price mismatch | Feed uses `customerPrice`; live page may show discounted price |
| Availability mismatch | `outofstock` flag may not reflect live inventory |
| Title too long | `productName + packingVolume` can exceed 150 chars |
| Missing `g:shipping` | Not included in feed — required for some GMC programs |

### Feed Quality Risks

1. **Single mega-query** — fetches all 111,826 active products in one `findMany()` call with no pagination. Safe with streaming, but the initial DB query may time out on a loaded VPS.
2. **No `g:shipping`** attribute — required for Google Shopping in some regions.
3. **No `g:custom_label_0..4`** — prevents campaign segmentation by product tier/margin.
4. **`og:type: 'website'`** on landing pages — GMC prefers landing pages with `og:type=product`.
5. **Out-of-stock products included** — Google Shopping deprioritises OOS listings; excluding them improves feed quality score.

---

## 5. Indexing Quality Analysis

> All counts from VPS MySQL queries run 2026-06-07

### Summary Table

```
Active products total:              111,826   (100.0%)
├── No image:                        12,861   (11.5%)  → dropped from GMC; "not indexed" risk
├── No priced variant:                5,693   (5.1%)   → no Offer schema; no price in SERP
├── No category:                      7,655   (6.8%)   → no breadcrumb depth; no related products
├── No variants at all:               2,947   (2.6%)   → subset of no-priced-variant
├── Description < 50 chars:           9,835   (8.8%)   → thin content; generic meta description
└── No description at all:            8,689   (7.8%)   → subset of short description
```

### Content Quality Gaps (Exact Counts)

| Signal | Count | % of catalog | SQL used |
|---|---|---|---|
| No description (NULL or empty) | **8,689** | 7.8% | `description IS NULL OR description = ''` |
| Description < 50 chars | **9,835** | 8.8% | `LENGTH(TRIM(description)) < 50` |
| No category | **7,655** | 6.8% | `category IS NULL OR TRIM(category) = ''` |
| No image | **12,861** | 11.5% | `LEFT JOIN ProductImage … pi.id IS NULL` |
| No variants at all | **2,947** | 2.6% | `LEFT JOIN ProductVariant … pv.id IS NULL` |
| No priced variant | **5,693** | 5.1% | `NOT EXISTS (SELECT 1 … customerPrice IS NOT NULL)` |

### Cascade Effect on GMC Feed

| Condition | Google feed | Meta feed |
|---|---|---|
| No image | **Dropped entirely** | **Dropped entirely** |
| No priced variant | Included, `<g:price>` omitted → disapproval | **Dropped entirely** |
| Description ≤ 20 chars | Constructed fallback string used | Same |
| No category | Generic `g:google_product_category` fallback | Same |

**Minimum GMC feed exclusion: 12,861 products (11.5%)** due to missing images alone.

### Indexing Risk Tiers

| Tier | Criteria | Est. count | Google risk |
|---|---|---|---|
| Full quality | Image + description ≥50 chars + category + priced variant | ~94,000–96,000 | Low |
| Missing price only | Has image + desc + category, but no `customerPrice` | ~2,000–3,000 | Medium |
| Missing image | No `ProductImage` row | **12,861** | High — "Crawled, not indexed" likely |
| Missing description | NULL / empty / <50 chars | **9,835** | High — thin content |
| Missing category | NULL/empty | **7,655** | Medium-high — no depth signals |

Note: groups overlap. A product can be missing image **and** description **and** category simultaneously (worst case for Google quality scoring).

### Sitemap Chunk Count Update

With 111,826 active products:
```
Math.ceil(111826 / 5000) = 23 product sitemaps
+ 1 non-product sitemap (sitemap/0.xml)
= 24 child sitemaps total
```
If the CDN-cached sitemap index still shows 22 or 23 chunks, `sitemap/23.xml` exists but is unlinked until the 1-hour cache expires and the index regenerates.

---

## 6. Internal Linking System

### How Products Receive Internal Links

**Source 1 — `/products` listing page**
**File:** `src/app/products/page.tsx` lines 37–55

```typescript
prisma.product.findMany({
  where: { isActive: true },
  select: { id, productName, genericName, category },
  orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  take: 5000,   // ← hard cap
})
// Rendered as <nav class="sr-only"> — crawlable by Googlebot, invisible to users
```

- Covers exactly **5,000 products** (newest + featured first)
- `sr-only` class is fine — Googlebot reads hidden-but-present links
- Hard cap of 5,000 is the binding constraint
- Also emits an `ItemList` JSON-LD for these 5,000 products

**Source 2 — Related products section on product pages**
**File:** `src/app/products/[id]/page.tsx` lines 199–211

```typescript
prisma.product.findMany({
  where: { category: data.category, isActive: true, id: { not: numId } },
  take: 4,
  orderBy: { id: 'desc' },
})
// Only runs if category is non-null and non-generic
```

- Max 4 outbound product links per product page
- Entirely absent for products with null/generic category (7,655+ products)
- Always links to the 4 newest products in the same category

**Source 3 — Company/brand filter links (NOT real crawlable links)**
```
href="/products?company={companyName}"
```
This is a JavaScript-filtered URL with no canonical page. Googlebot cannot efficiently crawl JS-rendered filter views.

**Source 4 — Category filter links (NOT real crawlable links)**
```
href="/products?category={category}"
```
Same problem — no standalone indexable page, JS-only rendering.

### Coverage Estimate

| Link source | Products covered | PageRank quality |
|---|---|---|
| `/products` sr-only nav | **5,000** | Real — full anchor tags in HTML |
| Related products (appearing as related) | Variable by category | Real — but only 4 per page, newest-only |
| Company filter URL | 0 indexable pages | None |
| Category filter URL | 0 indexable pages | None |
| Sitemap only (no HTML link) | **~106,826** | Zero PageRank |

**~106,826 products (95.5% of the catalog) rely solely on sitemap XML for discovery and receive zero PageRank-contributing internal links.**

---

## 7. Category & Brand SEO

### Category Pages — Do Not Exist

There are **no dedicated category route files** in the codebase. Searches for `app/category/`, `app/[category]/`, `app/products/[category]/` return nothing.

Category filtering is handled entirely client-side via the `ProductsClient` component, which calls `GET /api/product?category={value}`. The URL `/products?category=Veterinary` is:
- Not server-rendered
- Not included in the sitemap
- Not indexable with unique per-category content
- Not efficiently discoverable by Googlebot

### Brand/Company Pages — Exist But Are Weak

**Company listing page:** `src/app/Companies/page.tsx`
- Has static metadata (`title: "Partner Companies"`)
- **Renders entirely client-side** — server sends an empty shell, content arrives via JS
- Googlebot may index a near-empty page

**Company detail page:** `src/app/Companies/[id]/page.tsx`
- Has `generateMetadata()` with dynamic title, description, OG image
- Has `Organization` JSON-LD schema
- ISR with `revalidate = 1800`
- In sitemap/0.xml — indexed
- **Products listed on company page are fetched client-side** — not in initial HTML

### Indexability Assessment

| Page type | Indexable? | In sitemap? | Server-rendered content? |
|---|---|---|---|
| `/products` | YES | YES | Top 5,000 product links (sr-only) + ItemList JSON-LD |
| `/products/{id}` | YES | YES | Full SSR/ISR |
| `/products?category=X` | NO — parameterised, no canonical | NO | NO |
| `/products?company=X` | NO | NO | NO |
| `/Companies` | Partially — shell only | YES | Empty shell |
| `/Companies/{id}` | YES | YES | Metadata + JSON-LD server-side |
| Category pages (standalone) | Does not exist | N/A | N/A |
| Brand pages (standalone) | Does not exist | N/A | N/A |

### Distinct Category Values (Opportunity)

The `category` field contains 100+ distinct free-text values across 111,826 products. Each unique value represents a potential standalone category page with:
- Unique H1 and metadata
- Filtered product list
- Internal links from all products in that category
- Crawlable cluster for Googlebot

None of these pages currently exist.

---

## 8. Revenue-First Opportunities

### 5 Highest-Impact Changes to Increase Sales

**1. Fix GMC feed: enforce price field and add `g:shipping`**
Products where `<g:price>` is omitted are disapproved in GMC Shopping campaigns. The feed currently includes no-price products with the tag absent instead of excluding them. Fix: add `if (pricedVariants.length === 0) return ""` to `buildGoogleItem()` (already done for Meta feed at line 191 — copy the same guard). Also add a `<g:shipping>` element. This directly unblocks Shopping ads revenue.
- **File:** `src/app/products-feed.xml/route.ts` line 103

**2. Fix `og:type` from `'website'` to `'product'` on all product pages**
Facebook/Instagram Shopping and Pinterest Product Pins require `og:type=product` with `og:price:amount` and `og:price:currency`. The current `'website'` type disables social shopping integrations entirely. One-line change.
- **File:** `src/app/products/[id]/page.tsx` line 162

**3. Audit and fill zero-price variants**
Products where all `customerPrice` is null show no price on the product page, generate no Offer rich result, and are excluded from the Meta feed. A data-quality admin view to identify and bulk-fill these is a direct conversion rate lever across ~5,693 products.

**4. Add `outofstock: false` filter to GMC feed query**
The feed currently includes out-of-stock products. Google Shopping deprioritises or hides OOS listings and they cannot convert. Excluding them improves the feed's average quality score.
- **File:** `src/app/products-feed.xml/route.ts` line 252
- Change: `where: { isActive: true }` → `where: { isActive: true, outofstock: false }`

**5. Expand the GOOGLE_CATEGORY_MAP**
Only 9 of 100+ category values are mapped. All unmapped categories receive the generic `"Animals & Pet Supplies > Pet Supplies"` fallback, reducing relevance scores in Google Shopping. Run `SELECT DISTINCT category FROM Product WHERE isActive=true` and map each value to a precise GMC taxonomy ID.
- **File:** `src/app/products-feed.xml/route.ts` lines 10–20

---

### 5 Highest-Impact Changes to Increase Indexing

**1. Create server-rendered category pages at `/products/category/[slug]`**
This is the single highest-impact indexing change. 100+ distinct category values exist. Each page would have a unique H1, canonical URL, and product list — creating 100+ indexable pages each linked from product breadcrumbs. Currently zero such pages exist, so all category-level search traffic is lost.

**2. Fix sitemap `skip`-offset with cursor-based pagination**
Replace `skip: (id-1)*5000` with `cursor: { id: lastCursorId }`. This converts an O(N) full table scan into an O(1) index seek for every child sitemap. Googlebot timeouts on `sitemap/22.xml` and `sitemap/23.xml` will stop. This is the primary cause of low URL discovery in GSC.
- **File:** `src/app/sitemap/[id]/route.ts` line 174

**3. Add compound MySQL index `@@index([isActive, id])`**
```prisma
// prisma/schema.prisma — inside the Product model:
@@index([isActive, id])
```
This single migration fixes both the sitemap query and the feed query. Without it, every sitemap child request and every feed fetch performs a full 111,826-row table scan.

**4. Fix `lastmod` on static pages — replace `new Date()` with real dates**
Replace `lastModified: now` for all 19 static pages with actual `updatedAt` values or hardcoded dates matching their last real change. Currently every sitemap request re-timestamps all static pages as "just modified now," causing Google to distrust `lastmod` values across the entire sitemap.
- **File:** `src/app/sitemap/[id]/route.ts` line 48

**5. Raise the `/products` listing page product cap from 5,000 to 50,000+**
The 5,000 hard cap means 106,826 products (95.5%) receive no HTML internal links and zero PageRank. Raising this to 50,000 (with pagination or multiple `sr-only` navs) would pass link equity to the rest of the catalog and dramatically improve crawl coverage.
- **File:** `src/app/products/page.tsx` line 50 — change `take: 5000`

---

### Easiest Wins (Minimal Code Changes)

| Change | File | Line | Effort |
|---|---|---|---|
| Fix `<priority>1</priority>` → use `.toFixed(1)` | `src/app/sitemap/[id]/route.ts` | 28 | 1 line |
| Fix `og:type: 'website'` → `'product'` | `src/app/products/[id]/page.tsx` | 162 | 1 line |
| Add `<lastmod>` to sitemapindex `<sitemap>` entries | `src/app/sitemap.xml/route.ts` | 15 | 3 lines |
| Add `outofstock: false` to GMC feed `where` clause | `src/app/products-feed.xml/route.ts` | 252 | 1 word |
| Exclude no-price products from Google feed | `src/app/products-feed.xml/route.ts` | 103 | 1 line |
| Fix static page `lastmod` to real dates | `src/app/sitemap/[id]/route.ts` | 48–108 | Replace `now` with fixed date |
| Add `@@index([isActive, id])` Prisma migration | `prisma/schema.prisma` | end of Product model | 1 line + `prisma migrate` |

---

## Connection Reliability Note

A 100-request sequential curl test against `/robots.txt` (run in a previous session) returned:

```
200 × 96   (96% success)
000 × 4    (4% TCP connection failure — requests 19, 20, 44, 64)
```

A 4% TCP failure rate under sequential single-client load indicates VPS instability. Under concurrent Googlebot crawl of 23 sitemaps simultaneously, the failure rate would be significantly higher, compounding the "Discovered pages: 0" issue in GSC.

---

*End of audit. All findings are read-only observations. No files were modified.*
