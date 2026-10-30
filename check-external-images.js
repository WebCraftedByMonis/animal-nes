// check-external-images.js
// Read-only report: counts product (and other) image URLs by hostname, to
// find every external site next/image will refuse to optimize ("url"
// parameter is not allowed) because it's not in next.config.ts's
// remotePatterns allowlist. Scraped products (see scrape-products-*.ts
// routes) often save the image URL from the SOURCE site directly instead of
// downloading and re-hosting it — which breaks the moment that URL isn't on
// the allowlist, or later if the source site ever moves/deletes the image.
//
// Usage: node check-external-images.js

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ALLOWED = new Set(['animalwellness.shop', 'app.animalwellness.shop', 'res.cloudinary.com'])

async function report(label, rows, urlOf) {
  const hosts = {}
  let total = 0
  for (const r of rows) {
    const u = urlOf(r)
    if (!u) continue
    total++
    try { hosts[new URL(u).hostname] = (hosts[new URL(u).hostname] || 0) + 1 } catch { hosts['(unparseable)'] = (hosts['(unparseable)'] || 0) + 1 }
  }
  const sorted = Object.entries(hosts).sort((a, b) => b[1] - a[1])
  const blocked = sorted.filter(([h]) => !ALLOWED.has(h))
  console.log(`\n${label}: ${total} rows, ${sorted.length} distinct hostnames`)
  for (const [h, c] of sorted) console.log(`  ${String(c).padStart(6)}  ${ALLOWED.has(h) ? '' : '[BLOCKED by next.config.ts] '}${h}`)
  return blocked.reduce((n, [, c]) => n + c, 0)
}

async function main() {
  let blockedTotal = 0
  blockedTotal += await report('ProductImage', await prisma.productImage.findMany({ select: { url: true } }), r => r.url)
  blockedTotal += await report('CompanyImage', await prisma.companyImage.findMany({ select: { url: true } }), r => r.url)
  blockedTotal += await report('PartnerImage', await prisma.partnerImage.findMany({ select: { url: true } }), r => r.url)
  console.log(`\nTotal images on a blocked host: ${blockedTotal}`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) }).finally(() => prisma.$disconnect())
