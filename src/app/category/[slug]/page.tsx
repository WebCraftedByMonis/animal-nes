import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import {
  getAllCategories,
  slugToCategory,
  getDisplayLabel,
  toSlug,
  BLOCKED_CATEGORIES,
} from '@/lib/category-utils'

export const revalidate = 3600

const BASE_URL = 'https://animalwellness.shop'
const PAGE_SIZE = 48

export async function generateStaticParams() {
  const categories = await getAllCategories()
  return categories.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = await slugToCategory(slug)
  if (!category) return { title: 'Category Not Found | Animal Wellness' }

  const label = getDisplayLabel(category)
  const count = await prisma.product.count({
    where: { isActive: true, category },
  })

  const title = `${label} Products | Buy Online - Animal Wellness`
  const description = `Browse ${count.toLocaleString()} ${label} products at Animal Wellness. Best prices in Pakistan. Fast nationwide delivery.`

  return {
    title,
    description,
    keywords: [label, `${label} Pakistan`, `buy ${label}`, `${label} price Pakistan`, 'animal wellness', 'veterinary products'],
    openGraph: {
      title: `${label} Products - Animal Wellness`,
      description,
      type: 'website',
      siteName: 'Animal Wellness',
    },
    alternates: { canonical: `${BASE_URL}/category/${slug}` },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug }     = await params
  const { page: p }  = await searchParams
  const page         = Math.max(1, parseInt(p ?? '1', 10) || 1)

  const category = await slugToCategory(slug)
  if (!category) return notFound()

  const label = getDisplayLabel(category)

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, category },
      select: {
        id: true,
        productName: true,
        genericName: true,
        outofstock: true,
        isFeatured: true,
        image: { select: { url: true, alt: true } },
        variants: {
          select: { customerPrice: true },
          orderBy: { customerPrice: 'asc' },
          take: 1,
        },
        company: { select: { companyName: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where: { isActive: true, category } }),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // ── JSON-LD ──
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Categories', item: `${BASE_URL}/category` },
      { '@type': 'ListItem', position: 3, name: label, item: `${BASE_URL}/category/${slug}` },
    ],
  }

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${label} Products`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: (page - 1) * PAGE_SIZE + i + 1,
      url: `${BASE_URL}/products/${p.id}`,
      name: p.productName,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      {/* canonical + prev/next */}
      {page > 1 && <link rel="canonical" href={`${BASE_URL}/category/${slug}`} />}
      {page > 1 && <link rel="prev" href={page === 2 ? `${BASE_URL}/category/${slug}` : `${BASE_URL}/category/${slug}?page=${page - 1}`} />}
      {page < totalPages && <link rel="next" href={`${BASE_URL}/category/${slug}?page=${page + 1}`} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <li><Link href="/" className="hover:text-green-600 transition-colors">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/category" className="hover:text-green-600 transition-colors">Categories</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900 dark:text-gray-100 font-medium">{label}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {label} Products
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            {totalCount.toLocaleString()} products
            {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
          </p>
        </div>

        {/* Product grid */}
        {products.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-20">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {products.map((product) => {
              const price = product.variants[0]?.customerPrice
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all duration-200"
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-gray-50 dark:bg-zinc-800">
                    {product.image ? (
                      <Image
                        src={product.image.url.replace(/^http:\/\//, 'https://')}
                        alt={product.image.alt || product.productName}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs text-center px-2">
                        No image
                      </div>
                    )}
                    {product.isFeatured && (
                      <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                    {product.outofstock && (
                      <span className="absolute top-1.5 right-1.5 bg-red-100 text-red-600 text-[10px] font-medium px-1.5 py-0.5 rounded">
                        Out of stock
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {product.company?.companyName ?? ''}
                    </p>
                    <h2 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {product.productName}
                    </h2>
                    {price != null ? (
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        Rs. {price.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Price on request</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2 flex-wrap">
            {page > 1 && (
              <Link
                href={page === 2 ? `/category/${slug}` : `/category/${slug}?page=${page - 1}`}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                ← Previous
              </Link>
            )}

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <Link
                  key={pageNum}
                  href={pageNum === 1 ? `/category/${slug}` : `/category/${slug}?page=${pageNum}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === page
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {pageNum}
                </Link>
              )
            })}

            {page < totalPages && (
              <Link
                href={`/category/${slug}?page=${page + 1}`}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Next →
              </Link>
            )}
          </nav>
        )}

        {/* Related categories */}
        <RelatedCategories currentSlug={slug} currentCategory={category} />
      </div>
    </>
  )
}

async function RelatedCategories({
  currentSlug,
  currentCategory,
}: {
  currentSlug: string
  currentCategory: string
}) {
  const allCategories = await getAllCategories()
  const related = allCategories
    .filter((c) => c.slug !== currentSlug)
    .slice(0, 12)

  if (related.length === 0) return null

  return (
    <section className="mt-16 pt-10 border-t border-gray-100 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Browse Other Categories
      </h2>
      <div className="flex flex-wrap gap-2">
        {related.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition-colors"
          >
            {c.displayLabel}
            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({c.count.toLocaleString()})</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
