// migrate-images.js
// Run on the VPS from the project root: node migrate-images.js
// Downloads all external product images and saves them to uploads/media/
// then updates the DB URL to the local serve path.

const { PrismaClient } = require('@prisma/client')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media')
const BATCH_SIZE = 30
const BATCH_DELAY_MS = 1000
const DOWNLOAD_TIMEOUT_MS = 15000
const BASE_URL = 'https://animalwellness.shop'

// Progress file to resume if interrupted
const PROGRESS_FILE = path.join(process.cwd(), 'migrate-images-progress.json')

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
      console.log(`Resuming from progress file — ${data.done.length} already done, ${data.failed.length} failed`)
      return data
    }
  } catch {}
  return { done: [], failed: [] }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

function sanitizeFilename(url) {
  const ext = (url.split('?')[0].match(/\.(jpe?g|png|webp|gif)/i) || ['.jpg'])[0].toLowerCase()
  const base = url.split('/').pop().split('?')[0]
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 60)
  return `migrated_${base}_${Date.now()}${ext}`
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const timeout = setTimeout(() => reject(new Error('Timeout')), DOWNLOAD_TIMEOUT_MS)

    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeout)
        return downloadImage(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        clearTimeout(timeout)
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => { clearTimeout(timeout); resolve(Buffer.concat(chunks)) })
      res.on('error', err => { clearTimeout(timeout); reject(err) })
    }).on('error', err => { clearTimeout(timeout); reject(err) })
  })
}

async function processBatch(batch, progress) {
  await Promise.allSettled(
    batch.map(async (row) => {
      if (progress.done.includes(row.id)) return

      try {
        const buffer = await downloadImage(row.url)
        if (buffer.length < 500) throw new Error('Image too small — likely a placeholder')

        const filename = sanitizeFilename(row.url)
        const filePath = path.join(UPLOAD_DIR, filename)
        fs.writeFileSync(filePath, buffer)

        const newUrl = `${BASE_URL}/api/admin/media/serve/${encodeURIComponent(filename)}`
        await prisma.productImage.update({
          where: { id: row.id },
          data: { url: newUrl },
        })

        progress.done.push(row.id)
      } catch (err) {
        progress.failed.push({ id: row.id, url: row.url, error: err.message })
        process.stdout.write('x')
      }
    })
  )
}

async function main() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }

  const progress = loadProgress()
  const doneSet = new Set(progress.done)

  // Fetch all external images for active products
  const rows = await prisma.productImage.findMany({
    where: {
      product: { isActive: true },
      NOT: [
        { url: { contains: 'cloudinary' } },
        { url: { contains: 'animalwellness.shop' } },
      ],
    },
    select: { id: true, url: true },
  })

  const pending = rows.filter(r => !doneSet.has(r.id))
  const total = rows.length
  console.log(`Total external images: ${total}`)
  console.log(`Already done: ${progress.done.length}`)
  console.log(`Remaining: ${pending.length}`)
  console.log(`Batching ${pending.length} images in groups of ${BATCH_SIZE}...\n`)

  let processed = 0
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    await processBatch(batch, progress)
    processed += batch.length
    process.stdout.write(`\n[${processed}/${pending.length}] done, ${progress.failed.length} failed\n`)
    saveProgress(progress)

    if (i + BATCH_SIZE < pending.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  console.log('\n--- DONE ---')
  console.log(`Migrated: ${progress.done.length}`)
  console.log(`Failed:   ${progress.failed.length}`)
  if (progress.failed.length > 0) {
    fs.writeFileSync('migrate-images-failed.json', JSON.stringify(progress.failed, null, 2))
    console.log('Failed URLs saved to migrate-images-failed.json')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
