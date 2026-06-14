import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

export function toSlug(category: string): string {
  return category
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const BLOCKED_CATEGORIES = new Set([
  'Uncategorized', 'uncategorized',
  'null', 'NULL',
  'simple', 'variable', 'BASIC',
  'AL', 'al',
  'Shop', 'All Products',
  'Food',
  'bowl',
  'harness',
  'cat-wet-food',
  'Dog/Cat',
  'Cat/Dog Accessories',
  'Cat/Dog Travel Accessories',
  'General',
  'Accessories',
])

export const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  'Animals & Pet Supplies': 'Pet Supplies',
  'CAT LITTER':            'Cat Litter',
  'Wet Food for Cats':     'Wet Cat Food',
  'FLY PREVENTION':        'Fly Prevention',
  'Non-prescription Cat Food': 'Non-Prescription Cat Food',
  'Non-prescription Dog Food': 'Non-Prescription Dog Food',
  'Poultry':    'Poultry Products',
  'Dog':        'Dog Products',
  'Cat':        'Cat Products',
  'Veterinary': 'Veterinary Products',
  'Medicine':   'Pet Medicine',
  'Sheep':      'Sheep Products',
  'Bird':       'Bird Products',
  'Beds':       'Pet Beds',
  'Leash':      'Dog Leashes',
  'Toys':       'Pet Toys',
  'Treats':     'Pet Treats',
  'Dog Treat':  'Dog Treats',
  'Cat Treat':  'Cat Treats',
  'Grooming':   'Pet Grooming',
}

export function getDisplayLabel(category: string): string {
  return CATEGORY_DISPLAY_LABELS[category] ?? category
}

export interface CategoryEntry {
  category: string
  slug: string
  displayLabel: string
  count: number
}

export const getAllCategories = unstable_cache(
  async (): Promise<CategoryEntry[]> => {
    const groups = await prisma.product.groupBy({
      by: ['category'],
      where: { isActive: true, category: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    const seen = new Set<string>()
    const result: CategoryEntry[] = []

    for (const g of groups) {
      const cat = g.category
      if (!cat || BLOCKED_CATEGORIES.has(cat) || g._count.id < 10) continue
      const slug = toSlug(cat)
      if (seen.has(slug)) continue  // skip slug collisions (keep highest count)
      seen.add(slug)
      result.push({
        category:     cat,
        slug,
        displayLabel: getDisplayLabel(cat),
        count:        g._count.id,
      })
    }

    return result
  },
  ['all-categories'],
  { revalidate: 3600 }
)

export async function slugToCategory(slug: string): Promise<string | null> {
  const categories = await getAllCategories()
  return categories.find((c) => c.slug === slug)?.category ?? null
}
