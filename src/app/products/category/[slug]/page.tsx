import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { toSlug, isValidCategory, toProductUrl } from '@/lib/slug-utils'

export const revalidate = 86400
export const dynamicParams = true

const BASE_URL = 'https://animalwellness.shop'
const PER_PAGE = 60

type CategoryRow = { category: string; count: bigint }

// Counts a category by DISTINCT product, whether it's the product's primary
// `category` or one of its additional ProductCategory assignments — a
// product tagged both ways for the same category only counts once.
async function getAllValidCategories(): Promise<CategoryRow[]> {
  const rows = await prisma.$queryRaw<CategoryRow[]>`
    SELECT category, COUNT(*) as count FROM (
      SELECT DISTINCT p.category AS category, p.id AS productId
      FROM Product p
      WHERE p.isActive = 1 AND p.category IS NOT NULL AND p.category != ''
      UNION
      SELECT DISTINCT pc.category AS category, pc.productId AS productId
      FROM ProductCategory pc
      INNER JOIN Product p ON p.id = pc.productId
      WHERE p.isActive = 1
    ) combined
    GROUP BY category
    HAVING count >= 5
    ORDER BY count DESC
  `
  return rows.filter(r => isValidCategory(r.category, Number(r.count)))
}

async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const all = await getAllValidCategories()
  return all.find(r => toSlug(r.category) === slug) ?? null
}

export async function generateStaticParams() {
  const categories = await getAllValidCategories()
  return categories.map(r => ({ slug: toSlug(r.category) }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) return { title: 'Category Not Found | Animal Wellness' }

  const name = cat.category
  const count = Number(cat.count)
  return {
    title: `${name} — Buy Online in Pakistan | Animal Wellness`,
    description: `Shop ${count}+ ${name} products at Animal Wellness. Veterinary-grade quality with fast delivery across Pakistan and UAE.`,
    alternates: { canonical: `${BASE_URL}/products/category/${slug}` },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  const cat = await getCategoryBySlug(slug)
  if (!cat) notFound()

  const categoryName = cat.category
  const totalCount = Number(cat.count)
  const totalPages = Math.ceil(totalCount / PER_PAGE)

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { category: categoryName },
        { categories: { some: { category: categoryName } } },
      ],
    },
    select: {
      id: true,
      productName: true,
      genericName: true,
      category: true,
      image: { select: { url: true } },
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
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryName} — Animal Wellness`,
    url: `${BASE_URL}/products/category/${slug}`,
    description: `${totalCount}+ ${categoryName} products available at Animal Wellness Shop.`,
    numberOfItems: totalCount,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/products" className="hover:underline">Products</Link>
          {' › '}
          <span>{categoryName}</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {categoryName}
        </h1>
        <p className="text-sm text-gray-500 mb-6">{totalCount} products</p>

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
                      src={p.image.url}
                      alt={p.productName}
                      className="w-full h-32 object-contain mb-2"
                      loading="lazy"
                    />
                  )}
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                    {p.productName}
                    {p.genericName && p.genericName !== 'Veterinary' && p.genericName !== 'NULL'
                      ? ` (${p.genericName})`
                      : ''}
                  </p>
                  {price != null && (
                    <p className="text-sm font-semibold text-green-600 mt-1">
                      PKR {price.toLocaleString()}
                    </p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex justify-center gap-2 mt-10 flex-wrap">
            {page > 1 && (
              <Link
                href={`/products/category/${slug}?page=${page - 1}`}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
              >
                ← Previous
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              const p = i + 1
              return (
                <a
                  key={p}
                  href={`/products/category/${slug}?page=${p}`}
                  className={`px-3 py-1 rounded border text-sm ${
                    p === page
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {p}
                </a>
              )
            })}
            {totalPages > 10 && <span className="px-2 py-1 text-sm">…{totalPages}</span>}
            {page < totalPages && (
              <Link
                href={`/products/category/${slug}?page=${page + 1}`}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
              >
                Next →
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  )
}
