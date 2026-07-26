// Run on VPS: node apply-descriptions.js
// Reads descriptions-output.json (array of {id, description})
// and updates the Product table in bulk.

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function main() {
  const filePath = process.argv[2] || 'descriptions-output.json'

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    console.error('Usage: node apply-descriptions.js descriptions-output.json')
    process.exit(1)
  }

  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  console.log(`Loaded ${items.length} descriptions to apply`)

  let updated = 0
  let failed = 0

  for (const { id, description } of items) {
    if (!id || !description || description.trim().length < 50) {
      console.warn(`Skipping id=${id} — description too short or missing`)
      failed++
      continue
    }
    try {
      await prisma.product.update({
        where: { id: Number(id) },
        data: { description: description.trim() },
      })
      updated++
      if (updated % 100 === 0) console.log(`  Updated ${updated}/${items.length}`)
    } catch (e) {
      console.error(`  Failed id=${id}: ${e.message}`)
      failed++
    }
  }

  console.log(`\nDone. Updated: ${updated}  Failed: ${failed}`)
}

main().finally(() => prisma.$disconnect())
