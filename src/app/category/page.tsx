import Link from 'next/link'
import { getAllCategories } from '@/lib/category-utils'

export const revalidate = 3600

const BASE_URL = 'https://animalwellness.shop'

export const metadata = {
  title: 'Browse All Product Categories | Animal Wellness',
  description: 'Explore all veterinary and pet product categories at Animal Wellness — dog food, cat food, bird supplies, aquarium products, poultry, small animals and more.',
  alternates: { canonical: `${BASE_URL}/category` },
  openGraph: {
    title: 'Browse All Product Categories | Animal Wellness',
    description: 'Find veterinary and pet products by category — dogs, cats, birds, fish, poultry, small animals and more.',
    type: 'website',
    siteName: 'Animal Wellness',
  },
}

export default async function CategoryIndexPage() {
  const categories = await getAllCategories()

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Categories', item: `${BASE_URL}/category` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <li><Link href="/" className="hover:text-green-600 transition-colors">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900 dark:text-gray-100 font-medium">Categories</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Browse All Categories
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {categories.length} categories · explore products by type
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="group flex flex-col items-center justify-center text-center p-5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all duration-200 min-h-[100px]"
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors leading-snug">
                {c.displayLabel}
              </span>
              <span className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                {c.count.toLocaleString()} products
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
