// check-migrated-corrupt.js
// Finds ProductImage rows whose url points at a migrated_ file on this server
// but the file on disk is not actually an image (e.g. an HTML error page saved
// as .jpg by a previous migrate-images.js run that didn't validate content).
//
// Default: report only. Pass --fix to delete the corrupt files and reset the
// DB rows back to "(corrupt)" so the next migrate-images.js run re-downloads
// them from the original source (if the original url was stored — otherwise
// they're just flagged for manual review).

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media')
const FIX = process.argv.includes('--fix')

const IMAGE_SIGS = ['ffd8ff', '89504e47', '47494638', '52494646']

function isImageFile(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(4)
    fs.readSync(fd, buf, 0, 4, 0)
    fs.closeSync(fd)
    const hex = buf.toString('hex')
    return IMAGE_SIGS.some(sig => hex.startsWith(sig))
  } catch {
    return false
  }
}

async function main() {
  const rows = await prisma.productImage.findMany({
    where: { url: { contains: '/media/serve/migrated_' } },
    select: { id: true, url: true, productId: true },
  })

  console.log(`ProductImage rows pointing at migrated_ files: ${rows.length}`)

  let corrupt = 0
  let missing = 0
  let ok = 0
  const corruptRows = []

  for (const row of rows) {
    const filename = decodeURIComponent(row.url.split('/media/serve/').pop())
    const filePath = path.join(UPLOAD_DIR, filename)

    if (!fs.existsSync(filePath)) {
      missing++
      corruptRows.push({ ...row, reason: 'file missing' })
      continue
    }

    if (!isImageFile(filePath)) {
      corrupt++
      corruptRows.push({ ...row, reason: 'not an image', filePath })
      continue
    }

    ok++
  }

  console.log(`\n  Valid images: ${ok}`)
  console.log(`  Corrupt (HTML/other): ${corrupt}`)
  console.log(`  Missing from disk: ${missing}`)

  if (corruptRows.length === 0) {
    console.log('\nAll migrated files are valid images.')
    return
  }

  if (!FIX) {
    console.log(`\nRun with --fix to delete corrupt files and mark rows for re-migration.`)
    if (corruptRows.length <= 20) {
      corruptRows.forEach(r => console.log(`  id=${r.id} product=${r.productId} ${r.reason}`))
    }
    return
  }

  console.log(`\nFixing ${corruptRows.length} rows...`)
  let fixed = 0
  for (const row of corruptRows) {
    if (row.filePath && fs.existsSync(row.filePath)) {
      fs.unlinkSync(row.filePath)
    }
    // Set url to a marker that migrate-images.js won't match as
    // "animalwellness.shop" so it gets picked up on the next run — but we
    // need the ORIGINAL external url to re-download. We don't have it here,
    // so mark it with a prefix that makes the image fail visibly rather than
    // serving an HTML page pretending to be a jpg.
    await prisma.productImage.update({
      where: { id: row.id },
      data: { url: `CORRUPT:${row.url}` },
    })
    fixed++
  }
  console.log(`Done: ${fixed} rows marked as CORRUPT, files deleted.`)
  console.log('These images need their original source URLs restored to re-download.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
