export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Categories excluded from having their own page
const EXCLUDED_CATEGORIES = new Set([
  'veterinary supplies online', // 51K catch-all, not a real category
  'null',
  'shop',
  'food',
  'care',
  'supplements',
])

export function isValidCategory(category: string, count: number): boolean {
  if (count < 5) return false
  const lower = category.toLowerCase().trim()
  if (EXCLUDED_CATEGORIES.has(lower)) return false
  // Skip ingredient-list categories (contain numbers + units like mg, gm, ml, iu)
  if (/\d+\s*(mg|gm|ml|iu|miu|kg|gm\/|ltr)/i.test(category)) return false
  // Skip very long strings (ingredient lists)
  if (category.length > 80) return false
  return true
}

// Internal seller accounts that shouldn't get brand pages
const EXCLUDED_BRANDS = new Set([
  'monis raza3',
  'smbgb2b',
])

export function isValidBrand(name: string, count: number): boolean {
  if (count < 50) return false
  if (EXCLUDED_BRANDS.has(name.toLowerCase())) return false
  return true
}
