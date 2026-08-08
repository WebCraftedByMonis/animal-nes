import { Metadata } from 'next'
import Link from 'next/link'
import { ANIMALS } from '@/lib/animal-config'
import { prisma } from '@/lib/prisma'

export const revalidate = 86400

const BASE_URL = 'https://animalwellness.shop'

export const metadata: Metadata = {
  title: 'Shop by Animal — Veterinary Products for Every Animal | Animal Wellness',
  description: 'Browse veterinary medicines, supplements and care products by animal type — dogs, cats, poultry, horses, livestock and more. Fast delivery across Pakistan and UAE.',
  alternates: { canonical: `${BASE_URL}/animals` },
}

export default async function AnimalsIndexPage() {
  // Get product counts per animal in parallel
  const counts = await Promise.all(
    ANIMALS.map(a =>
      prisma.product.count({
        where: { isActive: true, category: { in: a.categories } },
      })
    )
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:underline">Home</Link>
        {' › '}
        <span>Shop by Animal</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Shop by Animal
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-10">
        Find the right veterinary products for your animal. Click any category to browse.
      </p>

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ANIMALS.map((animal, i) => (
          <li key={animal.slug}>
            <Link
              href={`/animals/${animal.slug}`}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors text-center group"
            >
              <span className="text-4xl">{animal.emoji}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                {animal.name}
              </span>
              <span className="text-xs text-gray-500">
                {counts[i].toLocaleString()} products
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
