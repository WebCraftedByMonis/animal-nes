// watermark-products.js
// Embosses the Animal Wellness Shop logo onto every product image.
// Downloads each image (Cloudinary / external / local), composites the logo
// in the bottom-right corner at ~40 % opacity, saves the result to
// uploads/media/, and updates the DB URL.
//
// Usage:  node watermark-products.js          (dry run — preview only)
//         node watermark-products.js --apply  (actually write)

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const sharp = require('sharp')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media')
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo-removebg-preview.png')
const BATCH_SIZE = 5
const BATCH_DELAY_MS = 1500
const DOWNLOAD_TIMEOUT_MS = 30000
const LOGO_WIDTH_RATIO = 0.15 // logo = 15 % of image width
const LOGO_OPACITY = 0.4
const LOGO_MARGIN = 16 // px from edge

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://app.animalwellness.shop'
).replace(/\/$/, '')

const IMAGE_SIGS = ['ffd8ff', '89504e47', '47494638', '52494646']
function isImageBuffer(buf) {
  if (buf.length < 4) return false
  const hex = buf.slice(0, 4).toString('hex')
  return IMAGE_SIGS.some(sig => hex.startsWith(sig))
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const req = proto.get(url, { timeout: DOWNLOAD_TIMEOUT_MS, headers: { 'User-Agent': 'AnimalWellnessShop/1.0' } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve, reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function localPathFromUrl(url) {
  // /api/admin/media/serve/filename.jpg → uploads/media/filename.jpg
  const match = url.match(/\/api\/admin\/media\/serve\/([^?]+)/)
  if (!match) return null
  const filename = decodeURIComponent(match[1])
  const full = path.join(UPLOAD_DIR, filename)
  return fs.existsSync(full) ? full : null
}

async function getImageBuffer(url) {
  const local = localPathFromUrl(url)
  if (local) return fs.readFileSync(local)
  return downloadImage(url)
}

async function watermark(imageBuffer, logoBuffer) {
  const image = sharp(imageBuffer)
  const meta = await image.metadata()
  const imgW = meta.width || 800
  const imgH = meta.height || 800

  const logoW = Math.max(Math.round(imgW * LOGO_WIDTH_RATIO), 40)

  const resizedLogo = await sharp(logoBuffer)
    .resize({ width: logoW, withoutEnlargement: false })
    .ensureAlpha()
    .composite([{
      input: Buffer.from(
        `<svg><rect x="0" y="0" width="${logoW}" height="${logoW}" fill="white" fill-opacity="${LOGO_OPACITY}"/></svg>`
      ),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer()

  const logoMeta = await sharp(resizedLogo).metadata()
  const logoH = logoMeta.height || logoW

  const left = imgW - logoW - LOGO_MARGIN
  const top = imgH - logoH - LOGO_MARGIN

  return image
    .composite([{ input: resizedLogo, left: Math.max(left, 0), top: Math.max(top, 0) }])
    .jpeg({ quality: 90 })
    .toBuffer()
}

function makeFilename(origUrl) {
  const urlBase = origUrl.split('/').pop().split('?')[0]
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 50)
  const uid = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  return `wm-${urlBase}-${uid}.jpg`
}

async function main() {
  console.log(`\n=== Product Image Watermarker ===`)
  console.log(`Mode: ${APPLY ? '*** LIVE — will write files & update DB ***' : 'DRY RUN (pass --apply to write)'}`)
  console.log(`Logo: ${LOGO_PATH}`)
  console.log(`Output: ${UPLOAD_DIR}\n`)

  if (!fs.existsSync(LOGO_PATH)) {
    console.error('Logo file not found:', LOGO_PATH)
    process.exit(1)
  }

  const logoBuffer = fs.readFileSync(LOGO_PATH)

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }

  const images = await prisma.productImage.findMany({
    include: { product: { select: { id: true, productName: true } } },
    orderBy: { id: 'asc' }
  })

  console.log(`Found ${images.length} product images to watermark.\n`)

  const results = { ok: 0, skipped: 0, failed: 0 }
  const failures = []

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE)
    console.log(`--- Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(images.length / BATCH_SIZE)} ---`)

    for (const img of batch) {
      const label = `[${img.id}] ${img.product?.productName || 'unknown'}`
      try {
        const buf = await getImageBuffer(img.url)
        if (!isImageBuffer(buf)) {
          console.log(`  SKIP ${label} — not a valid image (HTML error page?)`)
          results.skipped++
          continue
        }

        const wmBuf = await watermark(buf, logoBuffer)
        const filename = makeFilename(img.url)
        const outPath = path.join(UPLOAD_DIR, filename)
        const newUrl = `${BASE_URL}/api/admin/media/serve/${encodeURIComponent(filename)}`

        if (APPLY) {
          fs.writeFileSync(outPath, wmBuf)
          await prisma.productImage.update({
            where: { id: img.id },
            data: { url: newUrl, publicId: filename }
          })
          console.log(`  OK   ${label} → ${filename} (${(wmBuf.length / 1024).toFixed(0)} KB)`)
        } else {
          console.log(`  OK   ${label} — would save ${filename} (${(wmBuf.length / 1024).toFixed(0)} KB)`)
        }
        results.ok++
      } catch (err) {
        console.log(`  FAIL ${label} — ${err.message}`)
        results.failed++
        failures.push({ id: img.id, url: img.url, error: err.message })
      }
    }

    if (i + BATCH_SIZE < images.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`OK: ${results.ok}  |  Skipped: ${results.skipped}  |  Failed: ${results.failed}`)
  if (failures.length) {
    console.log('\nFailed images:')
    failures.forEach(f => console.log(`  [${f.id}] ${f.url} — ${f.error}`))
  }
  if (!APPLY && results.ok > 0) {
    console.log('\nThis was a dry run. Run with --apply to write files and update the DB.')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
