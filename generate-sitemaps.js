// generate-sitemaps.js
// Writes static sitemap XML files to public/sitemaps/ so Nginx can serve them
// without hitting Next.js or MySQL per Googlebot request.
//
// Run once manually, then set a nightly cron on VPS:
//   0 2 * * * cd /var/www/animalwellness/animal-nes && node generate-sitemaps.js >> /var/log/sitemap-gen.log 2>&1

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const BASE_URL = 'https://animalwellness.shop'
const PRODUCTS_PER_SITEMAP = 5000
const OUTPUT_DIR = path.join(__dirname, 'public', 'sitemaps')

// Mirrors slug-utils.ts logic
function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const EXCLUDED_CATEGORIES = new Set([
  'veterinary supplies online', 'null', 'shop', 'food', 'care', 'supplements',
])

function isValidCategory(category, count) {
  if (count < 5) return false
  const lower = category.toLowerCase().trim()
  if (EXCLUDED_CATEGORIES.has(lower)) return false
  if (/\d+\s*(mg|gm|ml|iu|miu|kg|gm\/|ltr)/i.test(category)) return false
  if (category.length > 80) return false
  return true
}

const EXCLUDED_BRANDS = new Set(['monis raza3', 'smbgb2b'])

function isValidBrand(name, count) {
  if (count < 50) return false
  if (EXCLUDED_BRANDS.has(name.toLowerCase())) return false
  return true
}

function toProductUrl(id, productName, category) {
  const catSlug = category
    ? category.toLowerCase().replace(/&amp;/g, 'and').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general'
    : 'general'
  const prodSlug = (productName.toLowerCase().replace(/&amp;/g, 'and').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product') + '-' + id
  return `${BASE_URL}/products/${catSlug}/${prodSlug}`
}

// Mirrors PARTNER_TYPE_GROUPS from src/lib/partner-constants.ts
const PARTNER_TYPE_GROUPS = {
  veterinarian: ['Veterinarian (Clinic, Hospital, Consultant)'],
  sales: [
    'Sales and Marketing (Dealer, Distributor, Sales Person)',
    'Sales and Marketing ( dealer , distributor , sales person)',
  ],
  veterinary_assistant: ['Veterinary Assistant'],
  student: ['Student'],
  farmer: ['Farmer'],
  faculty: ['Faculty'],
}

function getPartnerUrl(partnerType, id) {
  if (!partnerType) return null
  if (PARTNER_TYPE_GROUPS.veterinarian.includes(partnerType)) return `${BASE_URL}/Veternarians/${id}`
  if (PARTNER_TYPE_GROUPS.sales.includes(partnerType))        return `${BASE_URL}/Sales/${id}`
  if (PARTNER_TYPE_GROUPS.veterinary_assistant.includes(partnerType)) return `${BASE_URL}/VeterinaryAssistants/${id}`
  if (PARTNER_TYPE_GROUPS.student.includes(partnerType))      return `${BASE_URL}/Students/${id}`
  if (PARTNER_TYPE_GROUPS.faculty.includes(partnerType))      return `${BASE_URL}/Faculty/${id}`
  if (PARTNER_TYPE_GROUPS.farmer.includes(partnerType))       return `${BASE_URL}/Farmers/${id}`
  return null
}

function toUrlsetXml(entries) {
  const urls = entries.map(e => {
    const lastmod = e.lastModified
      ? `    <lastmod>${new Date(e.lastModified).toISOString().split('T')[0]}</lastmod>\n`
      : ''
    const freq = e.changeFrequency ? `    <changefreq>${e.changeFrequency}</changefreq>\n` : ''
    const pri  = e.priority !== undefined ? `    <priority>${e.priority}</priority>\n` : ''
    return `  <url>\n    <loc>${e.url}</loc>\n${lastmod}${freq}${pri}  </url>`
  }).join('\n')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n</urlset>`
  )
}

function toIndexXml(sitemapUrls) {
  const items = sitemapUrls
    .map(u => `  <sitemap>\n    <loc>${u}</loc>\n  </sitemap>`)
    .join('\n')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${items}\n</sitemapindex>`
  )
}

async function buildNonProductEntries() {
  const now = new Date()

  const [partners, companies, news, vacancies, jobPosts, sellAnimals, dynamicForms] =
    await Promise.all([
      prisma.partner.findMany({ select: { id: true, partnerType: true, updatedAt: true } }),
      prisma.company.findMany({ select: { id: true, updatedAt: true } }),
      prisma.animalNews.findMany({ where: { isActive: true }, select: { id: true, updatedAt: true } }),
      prisma.jobForm.findMany({ select: { id: true, updatedAt: true } }),
      prisma.traditionalJobPost.findMany({ select: { id: true, updatedAt: true } }),
      prisma.sellAnimal.findMany({ where: { status: 'ACCEPTED' }, select: { id: true, updatedAt: true } }),
      prisma.dynamicForm.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    ])

  const staticPages = [
    { url: BASE_URL,                              lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/products`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/findDoctor`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/about`,                   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/contact`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/jobvacancy`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/traditionaljobposts`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/Veternarians`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/VeterinaryAssistants`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/Students`,                lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/Sales`,                   lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/Companies`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/buy`,                     lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE_URL}/animal-news`,             lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE_URL}/Applicants`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${BASE_URL}/Faculty`,                 lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/Farmers`,                 lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/master-trainer`,          lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/forms`,                   lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
  ]

  const partnerPages = partners
    .map(p => {
      const url = getPartnerUrl(p.partnerType, p.id)
      if (!url) return null
      return { url, lastModified: p.updatedAt ?? now, changeFrequency: 'monthly', priority: 0.6 }
    })
    .filter(Boolean)

  const companyPages = companies.map(c => ({
    url: `${BASE_URL}/Companies/${c.id}`,
    lastModified: c.updatedAt ?? now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const newsPages = news.map(n => ({
    url: `${BASE_URL}/animal-news/${n.id}`,
    lastModified: n.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const vacancyPages = vacancies.map(v => ({
    url: `${BASE_URL}/jobvacancy/${v.id}`,
    lastModified: v.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const jobPostPages = jobPosts.map(j => ({
    url: `${BASE_URL}/traditionaljobposts/${j.id}`,
    lastModified: j.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const animalPages = sellAnimals.map(a => ({
    url: `${BASE_URL}/buy/${a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const formPages = dynamicForms.map(f => ({
    url: `${BASE_URL}/forms/${f.slug}`,
    lastModified: f.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  // Category pages
  const catRows = await prisma.$queryRaw`
    SELECT category, COUNT(*) as count FROM Product
    WHERE isActive = 1 AND category IS NOT NULL AND category != ''
    GROUP BY category HAVING count >= 5 ORDER BY count DESC
  `
  const categoryPages = catRows
    .filter(r => isValidCategory(r.category, Number(r.count)))
    .map(r => ({
      url: `${BASE_URL}/products/category/${toSlug(r.category)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

  // Brand pages
  const brandRows = await prisma.$queryRaw`
    SELECT c.companyName, COUNT(p.id) as count
    FROM Product p JOIN Company c ON p.companyId = c.id
    WHERE p.isActive = 1
    GROUP BY c.id, c.companyName HAVING count >= 50 ORDER BY count DESC
  `
  const brandPages = brandRows
    .filter(r => isValidBrand(r.companyName, Number(r.count)))
    .map(r => ({
      url: `${BASE_URL}/brands/${toSlug(r.companyName)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

  return [
    ...staticPages,
    ...categoryPages,
    ...brandPages,
    ...partnerPages,
    ...companyPages,
    ...newsPages,
    ...vacancyPages,
    ...jobPostPages,
    ...animalPages,
    ...formPages,
  ].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  console.log(`[${new Date().toISOString()}] Generating sitemaps → ${OUTPUT_DIR}`)

  // Sitemap 0: non-product pages
  const nonProductEntries = await buildNonProductEntries()
  fs.writeFileSync(path.join(OUTPUT_DIR, '0.xml'), toUrlsetXml(nonProductEntries), 'utf8')
  console.log(`  0.xml — ${nonProductEntries.length} entries`)

  // Sitemaps 1-N: products in batches of 5,000
  const productCount = await prisma.product.count({ where: { isActive: true } })
  const numChunks = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP))
  console.log(`  ${productCount} active products → ${numChunks} product sitemap(s)`)

  let lastId = 0
  for (let i = 1; i <= numChunks; i++) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(lastId > 0 ? { id: { gt: lastId } } : {}),
      },
      select: { id: true, productName: true, category: true, updatedAt: true },
      take: PRODUCTS_PER_SITEMAP,
      orderBy: { id: 'asc' },
    })
    if (products.length === 0) break

    const entries = products.map(p => ({
      url: toProductUrl(p.id, p.productName, p.category),
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    fs.writeFileSync(path.join(OUTPUT_DIR, `${i}.xml`), toUrlsetXml(entries), 'utf8')
    console.log(`  ${i}.xml — ${products.length} products (IDs ${products[0].id}–${products[products.length - 1].id})`)
    lastId = products[products.length - 1].id
  }

  // Sitemap index
  const sitemapUrls = [
    `${BASE_URL}/sitemap/0.xml`,
    ...Array.from({ length: numChunks }, (_, i) => `${BASE_URL}/sitemap/${i + 1}.xml`),
  ]
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.xml'), toIndexXml(sitemapUrls), 'utf8')
  console.log(`  index.xml — ${sitemapUrls.length} sitemaps listed`)

  console.log(`[${new Date().toISOString()}] Done.`)
}

main()
  .catch(err => { console.error('Fatal:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
