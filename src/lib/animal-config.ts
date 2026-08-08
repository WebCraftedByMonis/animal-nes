// Maps URL slugs to DB category values and display metadata
// Add more animals or categories here as the catalogue grows

export interface AnimalConfig {
  slug: string
  name: string
  emoji: string
  description: string
  categories: string[]    // exact DB category values to query
  keywords: string[]
}

export const ANIMALS: AnimalConfig[] = [
  {
    slug: 'dogs',
    name: 'Dogs',
    emoji: '🐕',
    description: 'Veterinary medicines, food, supplements and accessories for dogs',
    categories: ['Dog', 'Non-prescription Dog Food', 'Dog Treat', 'Dog/Cat', 'Cat/Dog Accessories', 'Cat/Dog Travel Accessories', 'Leash', 'Toys', 'Beds', 'Grooming'],
    keywords: ['dog medicine Pakistan', 'dog food Pakistan', 'dog supplements', 'dog accessories', 'vet products for dogs', 'dog care products'],
  },
  {
    slug: 'cats',
    name: 'Cats',
    emoji: '🐈',
    description: 'Veterinary medicines, food, litter and accessories for cats',
    categories: ['Cat', 'Wet Food for Cats', 'CAT LITTER', 'Non-prescription Cat Food', 'Cat Treat', 'Dog/Cat', 'Cat/Dog Accessories', 'Cat/Dog Travel Accessories'],
    keywords: ['cat medicine Pakistan', 'cat food Pakistan', 'cat litter Pakistan', 'cat supplements', 'vet products for cats', 'cat care products'],
  },
  {
    slug: 'poultry',
    name: 'Poultry',
    emoji: '🐔',
    description: 'Poultry medicines, feed supplements and health products for broilers and layers',
    categories: ['Poultry', 'Poultry Feed'],
    keywords: ['poultry medicine Pakistan', 'broiler medicine', 'layer medicine', 'poultry supplements', 'poultry feed Pakistan', 'poultry vet products'],
  },
  {
    slug: 'equine',
    name: 'Equine / Horses',
    emoji: '🐎',
    description: 'Veterinary products, supplements and care items for horses and equine',
    categories: ['Equine'],
    keywords: ['horse medicine Pakistan', 'equine products', 'horse supplements', 'horse vet products', 'equine care Pakistan'],
  },
  {
    slug: 'livestock',
    name: 'Livestock',
    emoji: '🐄',
    description: 'Medicines, feed additives and health solutions for cattle, buffalo and livestock',
    categories: ['Livestock Feed', 'Sheep', 'Cattle', 'Animals & Pet Supplies'],
    keywords: ['livestock medicine Pakistan', 'cattle medicine', 'buffalo medicine', 'livestock supplements', 'animal health Pakistan'],
  },
  {
    slug: 'birds',
    name: 'Birds',
    emoji: '🦜',
    description: 'Vitamins, supplements and medicines for pet birds and avian species',
    categories: ['Bird'],
    keywords: ['bird medicine Pakistan', 'parrot medicine', 'avian supplements', 'bird vitamins Pakistan', 'pet bird care'],
  },
  {
    slug: 'fish',
    name: 'Fish & Aquatic',
    emoji: '🐟',
    description: 'Aquaculture medicines, water treatments and supplements for fish',
    categories: ['Fisheries & Aquaculture'],
    keywords: ['fish medicine Pakistan', 'aquaculture products', 'fish supplements', 'fish farming products', 'aquatic animal health'],
  },
  {
    slug: 'sheep',
    name: 'Sheep & Goats',
    emoji: '🐑',
    description: 'Veterinary medicines and supplements for sheep and goats',
    categories: ['Sheep'],
    keywords: ['sheep medicine Pakistan', 'goat medicine Pakistan', 'sheep supplements', 'small ruminant products', 'sheep vet products'],
  },
]

export const ANIMAL_MAP: Record<string, AnimalConfig> = Object.fromEntries(
  ANIMALS.map(a => [a.slug, a])
)
