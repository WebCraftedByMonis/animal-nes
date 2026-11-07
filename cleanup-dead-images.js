// cleanup-dead-images.js
// Removes ProductImage rows with dead external URLs or CORRUPT markers,
// then writes a CSV report of affected products for manual image re-upload.
//
// Default: dry run (report only). Pass --apply to delete rows.

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  // 1. Find rows marked CORRUPT by check-migrated-corrupt.js
  const corruptRows = await prisma.productImage.findMany({
    where: { url: { startsWith: 'CORRUPT:' } },
    select: { id: true, url: true, productId: true },
  })

  // 2. Find rows still pointing at dead external URLs (active products only)
  const externalRows = await prisma.productImage.findMany({
    where: {
      product: { isActive: true },
      NOT: [
        { url: { contains: 'cloudinary' } },
        { url: { contains: 'animalwellness.shop' } },
      ],
      url: { not: { startsWith: 'CORRUPT:' } },
    },
    select: { id: true, url: true, productId: true },
  })

  const allBad = [...corruptRows, ...externalRows]
  const productIds = [...new Set(allBad.map(r => r.productId))]

  // 3. Get product details for the report
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, productName: true, category: true, isActive: true },
  })
  const productMap = Object.fromEntries(products.map(p => [p.id, p]))

  // 4. Check which products have OTHER working images (so the report shows
  //    which ones are truly image-less after cleanup)
  const workingCounts = await prisma.productImage.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
      url: { contains: 'animalwellness.shop' },
      NOT: { url: { startsWith: 'CORRUPT:' } },
    },
    _count: true,
  })
  const workingMap = Object.fromEntries(workingCounts.map(r => [r.productId, r._count]))

  console.log(`Dead/corrupt image rows: ${allBad.length}`)
  console.log(`  CORRUPT markers: ${corruptRows.length}`)
  console.log(`  Dead external URLs: ${externalRows.length}`)
  console.log(`Unique products affected: ${productIds.length}`)

  const noOtherImage = productIds.filter(id => !workingMap[id])
  console.log(`Products left with NO image after cleanup: ${noOtherImage.length}`)

  // 5. Write CSV report
  const csvLines = [
    'Product ID,Product Name,Category,Active,Other Images Remaining,Dead URL',
  ]
  for (const row of allBad) {
    const p = productMap[row.productId] || {}
    const remaining = workingMap[row.productId] || 0
    const name = (p.productName || '').replace(/"/g, '""')
    const cat = (p.category || '').replace(/"/g, '""')
    const deadUrl = row.url.replace(/^CORRUPT:/, '')
    csvLines.push(`${row.productId},"${name}","${cat}",${p.isActive ?? ''},${remaining},"${deadUrl}"`)
  }
  fs.writeFileSync('dead-images-report.csv', csvLines.join('\n'))
  console.log(`\nReport saved: dead-images-report.csv`)

  if (!APPLY) {
    console.log(`\nDry run — no rows deleted. Run with --apply to remove the ${allBad.length} dead image rows.`)
    return
  }

  // 6. Delete the dead rows
  const ids = allBad.map(r => r.id)
  const result = await prisma.productImage.deleteMany({ where: { id: { in: ids } } })
  console.log(`\nDeleted ${result.count} dead ProductImage rows.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
