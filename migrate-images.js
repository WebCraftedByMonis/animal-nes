// migrate-images.js
// Run on the VPS from the project root: node migrate-images.js
// Downloads all external product images (scraped from other vendor sites —
// see scrape-products-*.ts) and saves them to uploads/media/, then updates
// the DB URL to the local serve path. Fixes the "url parameter is not
// allowed" error next/image throws for any host not in next.config.ts's
// remotePatterns — see check-external-images.js for how big the problem is
// before running this.

require('dotenv').config()
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
// Was hardcoded to the OLD root domain — the exact same bug fix-image-domain.js
// just fixed 60,778 rows of. Read from env like every other script does
// (see src/lib/site-url.ts) so this can't reintroduce it.
const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://app.animalwellness.shop'
).replace(/\/$/, '')

// Written after every batch so a dropped connection loses at most one
// batch's work, not the whole run — but note this is NOT used to skip rows
// on the next invocation (see main()'s comment). It's just this run's log.
const PROGRESS_FILE = path.join(process.cwd(), 'migrate-images-progress.json')

function logPriorRunIfAny() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
      console.log(`(Previous run: ${data.done?.length ?? 0} done, ${data.failed?.length ?? 0} failed — not reused, this run checks the live DB instead)\n`)
    }
  } catch {}
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

const IMAGE_SIGNATURES = {
  'ffd8ff':   'image/jpeg',
  '89504e47': 'image/png',
  '47494638': 'image/gif',
  '52494646': 'image/webp',
}

function isImageBuffer(buf) {
  if (buf.length < 4) return false
  const hex = buf.slice(0, 4).toString('hex')
  return Object.keys(IMAGE_SIGNATURES).some(sig => hex.startsWith(sig))
}

function downloadImage(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'))
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const timeout = setTimeout(() => reject(new Error('Timeout')), DOWNLOAD_TIMEOUT_MS)

    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeout)
        return downloadImage(res.headers.location, redirects + 1).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        clearTimeout(timeout)
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const ct = (res.headers['content-type'] || '').toLowerCase()
      if (ct && !ct.startsWith('image/') && !ct.startsWith('application/octet-stream')) {
        clearTimeout(timeout)
        return reject(new Error(`Not an image (content-type: ${ct})`))
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
      try {
        const buffer = await downloadImage(row.url)
        if (buffer.length < 500) throw new Error('Image too small — likely a placeholder')
        if (!isImageBuffer(buffer)) throw new Error('Downloaded file is not a valid image (bad magic bytes)')

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

  // The WHERE clause below already means "still pointing at an external
  // host right now" — a row only disappears from it once its url is
  // actually updated. So a past run's done-id list is NOT a safe skip list:
  // if scrape-products-*.ts ever re-syncs a product and overwrites its
  // image url back to the source site (reasonable to assume it does, since
  // nothing here proves otherwise), a previously-fixed row reverts and
  // reappears in `rows` with its old id — and the old code's two separate
  // id-skip checks (one in main, one in processBatch) would silently skip
  // it forever, because they trusted a FILE instead of the DATABASE. This
  // is almost certainly why an earlier run's progress file showed ~50K done
  // yet 19K+ rows were still actually blocked. Always process whatever the
  // live query returns, full stop — no skip list at all.
  logPriorRunIfAny()
  const progress = { done: [], failed: [] }

  // Fetch all external images for active products
  const pending = await prisma.productImage.findMany({
    where: {
      product: { isActive: true },
      NOT: [
        { url: { contains: 'cloudinary' } },
        { url: { contains: 'animalwellness.shop' } },
      ],
    },
    select: { id: true, url: true },
  })

  console.log(`Still pointing at an external host: ${pending.length}`)
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
