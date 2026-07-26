// node migrate-cloudinary.js
// Downloads all Cloudinary-hosted product images to uploads/media/
// and updates ProductImage.url in the DB to the VPS path.

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const prisma = new PrismaClient()
const MEDIA_DIR = path.join(process.cwd(), 'uploads', 'media')
const PROGRESS_FILE = 'migrate-cloudinary-progress.json'
const BATCH_SIZE = 20
const BATCH_DELAY_MS = 500

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE))
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
  } catch {}
  return { done: [], failed: [] }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2))
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Strip Cloudinary transformations to get the original image URL
// e.g. .../upload/w_500,h_500,c_fill/v123/file.jpg → .../upload/v123/file.jpg
function getOriginalUrl(url) {
  return url.replace(/\/upload\/[^/]*,[^/]*\//, '/upload/')
            .replace(/\/upload\/[a-z]_[^/]+\//, '/upload/')
}

function extFromUrl(url) {
  const clean = url.split('?')[0].split('#')[0]
  const m = clean.match(/\.([a-zA-Z0-9]+)$/)
  if (m) return m[1].toLowerCase()
  return 'jpg'
}

function download(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const client = parsed.protocol === 'https:' ? https : http

    const req = client.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true })

  const progress = loadProgress()
  const doneSet = new Set(progress.done)

  const images = await prisma.productImage.findMany({
    where: { url: { contains: 'cloudinary' } },
    select: { id: true, url: true, productId: true },
  })

  const pending = images.filter(i => !doneSet.has(i.id))
  console.log(`Total Cloudinary images: ${images.length}`)
  console.log(`Already migrated: ${progress.done.length}`)
  console.log(`Pending: ${pending.length}\n`)

  if (pending.length === 0) {
    console.log('All Cloudinary images already migrated!')
    return
  }

  let migrated = 0
  let failed = 0

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)

    await Promise.all(batch.map(async (img) => {
      try {
        const originalUrl = getOriginalUrl(img.url)
        const ext = extFromUrl(originalUrl)
        const hash = crypto.createHash('md5').update(originalUrl).digest('hex').slice(0, 12)
        const filename = `product-${img.productId}-${hash}.${ext}`
        const filepath = path.join(MEDIA_DIR, filename)

        // Skip download if file already exists on disk
        if (!fs.existsSync(filepath)) {
          const buffer = await download(originalUrl)
          fs.writeFileSync(filepath, buffer)
        }

        const newUrl = `https://animalwellness.shop/api/admin/media/serve/${filename}`
        await prisma.productImage.update({
          where: { id: img.id },
          data: { url: newUrl },
        })

        progress.done.push(img.id)
        migrated++
      } catch (err) {
        progress.failed.push({ id: img.id, url: img.url, error: err.message })
        failed++
      }
    }))

    saveProgress(progress)

    const done = Math.min(i + BATCH_SIZE, pending.length)
    process.stdout.write(`\r[${done}/${pending.length}] migrated: ${migrated}  failed: ${failed}`)

    if (i + BATCH_SIZE < pending.length) await sleep(BATCH_DELAY_MS)
  }

  console.log(`\n\nDone! Migrated: ${migrated}  Failed: ${failed}`)
  if (failed > 0) {
    console.log(`Failed image IDs saved in ${PROGRESS_FILE}`)
    console.log('Run again to retry failed ones.')
  }
}

main()
  .catch(e => { console.error('Fatal:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
