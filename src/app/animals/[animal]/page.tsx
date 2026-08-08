import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ANIMALS, ANIMAL_MAP } from '@/lib/animal-config'
import { toProductUrl } from '@/lib/slug-utils'

export const revalidate = 86400
export const dynamicParams = false

const BASE_URL = 'https://animalwellness.shop'
const PER_PAGE = 60

export function generateStaticParams() {
  return ANIMALS.map(a => ({ animal: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animal: string }>
}): Promise<Metadata> {
  const { animal: slug } = await params
  const config = ANIMAL_MAP[slug]
  if (!config) return { title: 'Not Found' }

  return {
    title: `${config.name} Products — Veterinary Medicines & Supplies | Animal Wellness`,
    description: `${config.description}. Shop trusted brands with fast delivery across Pakistan and UAE.`,
    keywords: config.keywords,
    alternates: { canonical: `${BASE_URL}/animals/${slug}` },
    openGraph: {
      title: `${config.emoji} ${config.name} Products — Animal Wellness`,
      description: config.description,
      type: 'website',
    },
  }
}

export default async function AnimalPage({
  params,
  searchParams,
}: {
  params: Promise<{ animal: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { animal: slug } = await params
  const { page: pageParam } = await searchParams
  const config = ANIMAL_MAP[slug]
  if (!config) notFound()

  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  const [totalCount, products] = await Promise.all([
    prisma.product.count({
      where: { isActive: true, category: { in: config.categories } },
    }),
    prisma.product.findMany({
      where: { isActive: true, category: { in: config.categories } },
      select: {
        id: true,
        productName: true,
        genericName: true,
        category: true,
        image: { select: { url: true, alt: true } },
        variants: {
          where: { customerPrice: { not: null } },
          select: { customerPrice: true },
          orderBy: { customerPrice: 'asc' },
          take: 1,
        },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: [{ isFeatured: 'desc' }, { id: 'asc' }],
    }),
  ])

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${config.name} Products — Animal Wellness`,
    description: config.description,
    url: `${BASE_URL}/animals/${slug}`,
    numberOfItems: totalCount,
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Animals', item: `${BASE_URL}/animals` },
      { '@type': 'ListItem', position: 3, name: config.name, item: `${BASE_URL}/animals/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Home</Link>
          {' › '}
          <Link href="/animals" className="hover:underline">Animals</Link>
          {' › '}
          <span>{config.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{config.emoji}</span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {config.name} Products
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">{config.description}</p>
          <p className="text-sm text-gray-500 mt-2">{totalCount.toLocaleString()} products available</p>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {config.categories.map(cat => (
            <Link
              key={cat}
              href={`/products/category/${cat.toLowerCase().replace(/&amp;/g, 'and').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
              className="px-3 py-1 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Products grid */}
        {products.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No products found in this category yet.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map(p => {
              const price = p.variants[0]?.customerPrice
              return (
                <li key={p.id}>
                  <Link
                    href={toProductUrl(p)}
                    className="block rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 transition-colors p-3 h-full"
                  >
                    {p.image?.url && (
                      <img
                        src={p.image.url.replace(/^http:\/\//, 'https://')}
                        alt={p.image.alt || p.productName}
                        className="w-full h-32 object-contain mb-2"
                        loading="lazy"
                      />
                    )}
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">{p.category}</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                      {p.productName}
                      {p.genericName && p.genericName !== 'Veterinary' && p.genericName !== 'NULL'
                        ? ` (${p.genericName})`
                        : ''}
                    </p>
                    {price != null ? (
                      <p className="text-sm font-semibold text-green-600 mt-1">PKR {price.toLocaleString()}</p>
                    ) : (
                      <p className="text-xs text-orange-500 mt-1 font-medium">Get Quote</p>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex justify-center gap-2 mt-10 flex-wrap">
            {page > 1 && (
              <Link href={`/animals/${slug}?page=${page - 1}`} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">
                ← Previous
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
              <a
                key={p}
                href={`/animals/${slug}?page=${p}`}
                className={`px-3 py-1 rounded border text-sm ${p === page ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                {p}
              </a>
            ))}
            {totalPages > 10 && <span className="px-2 py-1 text-sm">…{totalPages}</span>}
            {page < totalPages && (
              <Link href={`/animals/${slug}?page=${page + 1}`} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">
                Next →
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  )
}
