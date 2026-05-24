import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProductClient from './ProductClient'
import ProductReviewSection from '@/components/ProductReviewSection'
import { getApiUrl } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

export const revalidate = 1800

// ─── Taxonomy normalization ───────────────────────────────────────────────────
const GENERIC_LABELS = new Set([
  'uncategorized', 'general', 'n/a', '', 'undefined', 'null', 'other',
])

function normalizeCategory(cat: string | null | undefined): string {
  if (!cat || GENERIC_LABELS.has(cat.toLowerCase().trim())) return 'Veterinary Products'
  return cat
}

// ─── Description section parser ───────────────────────────────────────────────
interface ParsedSections {
  overview: string
  benefits: string | null
  nutritional: string | null
  suitableFor: string | null
  usage: string | null
}

function parseDescriptionSections(raw: string | null): ParsedSections {
  const empty: ParsedSections = {
    overview: '',
    benefits: null,
    nutritional: null,
    suitableFor: null,
    usage: null,
  }
  if (!raw) return empty

  // Markers for each section (case-insensitive)
  const markers = {
    benefits:
      /(?:^|\n)\s*(?:benefits?|key\s+benefits?|advantages?|key\s+features?|highlights?)[\s]*:/im,
    nutritional:
      /(?:^|\n)\s*(?:nutritional\s+(?:analysis|information|value|content)|nutrition(?:al)?)[\s]*:/im,
    suitableFor:
      /(?:^|\n)\s*(?:recommended\s+for|suitable\s+for|ideal\s+for|recommended\s+animals?|species)[\s]*:/im,
    usage:
      /(?:^|\n)\s*(?:ideal\s+usage|usage(?:\s+instructions?)?|feeding\s+(?:guidelines?|instructions?)|directions?|how\s+to\s+use|dosage\s+information)[\s]*:/im,
  }

  // Find all section positions
  const positions: { key: keyof typeof markers; index: number }[] = []
  for (const [key, re] of Object.entries(markers) as [keyof typeof markers, RegExp][]) {
    const m = raw.match(re)
    if (m && m.index !== undefined) positions.push({ key, index: m.index })
  }
  positions.sort((a, b) => a.index - b.index)

  if (positions.length === 0) {
    // No structured sections – whole text is the overview
    return { ...empty, overview: raw.trim() }
  }

  const result: ParsedSections = { ...empty, overview: raw.slice(0, positions[0].index).trim() }

  for (let i = 0; i < positions.length; i++) {
    const { key, index } = positions[i]
    const nextIndex = positions[i + 1]?.index ?? raw.length
    const colonPos = raw.indexOf(':', index)
    const content = raw.slice(colonPos + 1, nextIndex).trim()
    result[key] = content || null
  }

  return result
}

// ─── Static FAQ ───────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'How do I track my order?',
    a: 'After placing your order you will receive a confirmation email with tracking details. You can also check order status from your account dashboard.',
  },
  {
    q: 'Can I return a product?',
    a: 'We accept returns within 7 days of delivery for unopened products in their original packaging. Contact our support team to initiate a return.',
  },
  {
    q: 'Are your products authentic?',
    a: 'Yes, all products on Animal Wellness are sourced directly from manufacturers or authorized distributors to guarantee authenticity.',
  },
  {
    q: 'Do you offer cash on delivery?',
    a: 'Yes, cash on delivery (COD) is available for eligible orders across Pakistan.',
  },
  {
    q: 'How should I store this product?',
    a: 'Please refer to the product packaging for specific storage instructions. Generally, store in a cool, dry place away from direct sunlight.',
  },
]

// ─── Static Shipping Info ─────────────────────────────────────────────────────
const SHIPPING_INFO = [
  { label: 'Standard Delivery', value: '2–5 business days' },
  { label: 'Express Delivery', value: '1–2 business days (major cities)' },
  { label: 'Free Shipping', value: 'Orders over PKR 2,000' },
  { label: 'Cash on Delivery', value: 'Available nationwide' },
  { label: 'Coverage', value: 'Pakistan only' },
]

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const res = await fetch(`${getApiUrl()}/api/product/${id}`, { next: { revalidate: 1800 } })
    if (!res.ok) {
      return {
        title: 'Product Not Found | Animal Wellness',
        description: 'The requested product could not be found.',
      }
    }
    const { data } = await res.json()
    const price = data.variants?.[0]?.customerPrice
    const normalizedCat = normalizeCategory(data.category)
    const rawDesc: string | null = data.description

    const metaDescription = rawDesc
      ? rawDesc.replace(/\s+/g, ' ').trim().slice(0, 155) +
        (rawDesc.length > 155 ? '…' : '')
      : `Buy ${data.productName} — ${normalizedCat}${
          price ? ` from PKR ${price.toLocaleString()}` : ''
        }. Fast delivery across Pakistan.`

    return {
      title: `${data.productName} | Buy Online - Animal Wellness`,
      description: metaDescription,
      keywords: [
        data.productName,
        data.genericName,
        normalizedCat,
        data.subCategory,
        data.subsubCategory,
        data.productType,
        data.company?.companyName,
        data.partner?.partnerName,
        ...(data.variants?.map(
          (v: { packingVolume: string }) => `${data.productName} ${v.packingVolume}`
        ).filter(Boolean) ?? []),
        `buy ${data.productName}`,
        `${data.genericName} price`,
        `${normalizedCat} veterinary`,
        'veterinary products',
        'animal wellness',
        'buy veterinary medicine',
        'pet care products',
        'animal health products Pakistan',
      ].filter(Boolean),
      openGraph: {
        title: `${data.productName} - Buy Online`,
        description: metaDescription,
        images: data.image
          ? [{ url: data.image.url, width: 800, height: 600, alt: data.image.alt ?? data.productName }]
          : [],
        type: 'website',
        siteName: 'Animal Wellness',
      },
      alternates: { canonical: `/products/${id}` },
    }
  } catch {
    return { title: 'Product | Animal Wellness', description: 'Quality animal wellness products' }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return notFound()

  // Parallel: product fetch + approved reviews
  const [productRes, reviews] = await Promise.all([
    fetch(`${getApiUrl()}/api/product/${id}`, { next: { revalidate: 1800 } }),
    prisma.productReview.findMany({
      where: { productId: numId, isApproved: true },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  if (!productRes.ok) return notFound()
  const { data } = await productRes.json()

  // Related products (same category, excludes self) – runs after product resolves
  const relatedProducts =
    data.category && !GENERIC_LABELS.has(data.category.toLowerCase().trim())
      ? await prisma.product.findMany({
          where: { category: data.category, isActive: true, id: { not: numId } },
          select: {
            id: true,
            productName: true,
            image: { select: { url: true, alt: true } },
            variants: { take: 1, select: { customerPrice: true } },
          },
          take: 4,
          orderBy: { id: 'desc' },
        })
      : []

  // Computed values
  const baseUrl = 'https://animalwellness.shop'
  const normalizedCategory = normalizeCategory(data.category)
  const sections = parseDescriptionSections(data.description)
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length
      : null

  // Serialize reviews (Prisma Date → ISO string for client component)
  const serializedReviews = reviews.map((r: any) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: (r.createdAt as Date).toISOString(),
    user: { name: r.user.name as string | null, image: r.user.image as string | null },
  }))

  // ── Structured data ──
  const productSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: data.productName,
    description: data.description || `${data.productName} - Quality veterinary product`,
    ...(data.image?.url && { image: data.image.url }),
    brand: { '@type': 'Brand', name: data.company?.companyName || 'Animal Wellness' },
    manufacturer: {
      '@type': 'Organization',
      name: data.company?.companyName || 'Animal Wellness',
    },
    category: normalizedCategory,
    ...(reviews.length > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating!.toFixed(1),
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
      review: serializedReviews.slice(0, 5).map((r: any) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.user.name || 'Verified Customer' },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
        reviewBody: r.comment,
        datePublished: r.createdAt.split('T')[0],
      })),
    }),
    ...(data.variants?.length > 0 && {
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: Math.min(
          ...data.variants.map((v: any) => v.customerPrice).filter(Boolean)
        ),
        highPrice: Math.max(
          ...data.variants.map((v: any) => v.customerPrice).filter(Boolean)
        ),
        priceCurrency: 'PKR',
        offerCount: data.variants.length,
        availability: data.outofstock
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'Animal Wellness' },
      },
    }),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${baseUrl}/products` },
      ...(normalizedCategory !== 'Veterinary Products'
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: normalizedCategory,
              item: `${baseUrl}/products?category=${encodeURIComponent(data.category || '')}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: normalizedCategory !== 'Veterinary Products' ? 4 : 3,
        name: data.productName,
        item: `${baseUrl}/products/${id}`,
      },
    ],
  }

  return (
    <>
      {/* ── JSON-LD ──────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Breadcrumbs ──────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <Link href="/" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/products" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                Products
              </Link>
            </li>
            {normalizedCategory !== 'Veterinary Products' && data.category && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href={`/products?category=${encodeURIComponent(data.category)}`}
                    className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    {normalizedCategory}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li
              className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-[240px]"
              aria-current="page"
            >
              {data.productName}
            </li>
          </ol>
        </nav>

        {/* ── H1 + Stock Status ─────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex-1 leading-tight">
            {data.productName}
          </h1>
          {!data.outofstock && data.isActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              In Stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 shrink-0">
              Out of Stock
            </span>
          )}
        </div>

        {/* ── Unique intro paragraph ────────────────────────────────── */}
        {sections.overview && (
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-base leading-relaxed max-w-3xl">
            {sections.overview.length > 320
              ? sections.overview.slice(0, 320) + '…'
              : sections.overview}
          </p>
        )}

        {/* ── Purchase widget (client — handles variants/cart/wishlist) ─ */}
        <ProductClient product={data} />

        {/* ── Content sections (all SSR) ───────────────────────────── */}
        <div className="mt-12 space-y-10">
          {/* Product Overview */}
          {data.description && (
            <section aria-labelledby="overview-heading">
              <h2
                id="overview-heading"
                className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              >
                Product Overview
              </h2>
              <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {data.description}
              </div>
            </section>
          )}

          {/* Key Benefits */}
          {sections.benefits && (
            <section
              aria-labelledby="benefits-heading"
              className="bg-green-50 dark:bg-green-900/10 rounded-xl p-6"
            >
              <h2
                id="benefits-heading"
                className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              >
                Key Benefits
              </h2>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {sections.benefits}
              </div>
            </section>
          )}

          {/* Feeding & Usage Instructions */}
          {(data.dosage || sections.usage) && (
            <section aria-labelledby="usage-heading">
              <h2
                id="usage-heading"
                className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              >
                Feeding &amp; Usage Instructions
              </h2>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {data.dosage || sections.usage}
              </div>
            </section>
          )}

          {/* Suitable Animals */}
          {(sections.suitableFor ||
            (data.subCategory && !GENERIC_LABELS.has(data.subCategory.toLowerCase())) ||
            (data.productType && !GENERIC_LABELS.has(data.productType.toLowerCase()))) && (
            <section aria-labelledby="suitable-heading">
              <h2
                id="suitable-heading"
                className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              >
                Suitable For
              </h2>
              {sections.suitableFor ? (
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {sections.suitableFor}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[normalizedCategory, data.subCategory, data.productType]
                    .filter(
                      (t: string | null | undefined) =>
                        t && !GENERIC_LABELS.has(t.toLowerCase().trim())
                    )
                    .map((tag: string) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              )}
            </section>
          )}

          {/* Nutritional Information */}
          {sections.nutritional && (
            <section aria-labelledby="nutrition-heading">
              <h2
                id="nutrition-heading"
                className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              >
                Nutritional Information
              </h2>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed font-mono text-sm bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4">
                {sections.nutritional}
              </div>
            </section>
          )}

          {/* Product Taxonomy (internal links) */}
          <nav aria-label="Product taxonomy" className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Browse Related Categories
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400 transition-colors text-sm"
              >
                All Products
              </Link>
              {normalizedCategory !== 'Veterinary Products' && data.category && (
                <Link
                  href={`/products?category=${encodeURIComponent(data.category)}`}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400 transition-colors text-sm"
                >
                  {normalizedCategory}
                </Link>
              )}
              {data.subCategory &&
                !GENERIC_LABELS.has(data.subCategory.toLowerCase()) && (
                  <Link
                    href={`/products?subCategory=${encodeURIComponent(data.subCategory)}`}
                    className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400 transition-colors text-sm"
                  >
                    {data.subCategory}
                  </Link>
                )}
              {data.company?.companyName && (
                <Link
                  href={`/products?company=${encodeURIComponent(data.company.companyName)}`}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400 transition-colors text-sm"
                >
                  {data.company.companyName}
                </Link>
              )}
              <Link
                href="/Companies"
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400 transition-colors text-sm"
              >
                All Brands
              </Link>
            </div>
          </nav>

          {/* PDF Document */}
          {data.pdf && (
            <section aria-labelledby="docs-heading" className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
              <h2
                id="docs-heading"
                className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4"
              >
                Product Documents
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Product Information PDF
                  </p>
                  <a
                    href={data.pdf.url}
                    download={`${data.productName.replace(/\s+/g, '_')}_product_sheet.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm flex items-center gap-1 mt-1"
                  >
                    Download PDF
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Shipping Information */}
          <section
            aria-labelledby="shipping-heading"
            className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-6"
          >
            <h2
              id="shipping-heading"
              className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
            >
              Shipping Information
            </h2>
            <dl className="grid sm:grid-cols-2 gap-4">
              {SHIPPING_INFO.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {label}
                  </dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-2xl font-semibold text-gray-900 dark:text-white mb-6"
            >
              Frequently Asked Questions
            </h2>
            <dl className="space-y-4">
              {FAQ_ITEMS.map(({ q, a }) => (
                <div key={q} className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-5">
                  <dt className="font-semibold text-gray-900 dark:text-white mb-2">{q}</dt>
                  <dd className="text-gray-700 dark:text-gray-300 leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section aria-labelledby="related-heading">
              <h2
                id="related-heading"
                className="text-2xl font-semibold text-gray-900 dark:text-white mb-6"
              >
                Related Products
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedProducts.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="group bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow"
                  >
                    {p.image?.url && (
                      <div className="aspect-square mb-2 overflow-hidden rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image.url.replace(/^http:\/\//, 'https://')}
                          alt={p.image.alt || p.productName}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {p.productName}
                    </p>
                    {p.variants?.[0]?.customerPrice != null && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                        PKR {p.variants[0].customerPrice.toLocaleString()}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Reviews + Review Form (client, seeds from SSR initialReviews) */}
          <ProductReviewSection
            productId={numId}
            initialReviews={serializedReviews}
          />
        </div>
      </article>
    </>
  )
}
