// import-found-images.js
// Takes a CSV of {Product ID, Product Name, Image URL Found} (from Claude's
// web-search output) and downloads each image, saves it to uploads/media/,
// and creates a ProductImage row for that product.
//
// Usage: node import-found-images.js <path-to-csv>
// Dry run by default — pass --apply to write.

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media')
const APPLY = process.argv.includes('--apply')
const DOWNLOAD_TIMEOUT_MS = 30000

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

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = []
    let current = ''
    let inQuotes = false
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { parts.push(current); current = ''; continue }
      current += ch
    }
    parts.push(current)
    if (parts.length >= 3 && parts[0].trim() && parts[2].trim()) {
      rows.push({ productId: parseInt(parts[0].trim()), name: parts[1].trim(), imageUrl: parts[2].trim() })
    }
  }
  return rows
}

function download(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'))
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const timeout = setTimeout(() => reject(new Error('Timeout')), DOWNLOAD_TIMEOUT_MS)
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

    protocol.get(url, { headers: { 'User-Agent': ua } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        clearTimeout(timeout)
        const loc = res.headers.location
        if (!loc) return reject(new Error(`Redirect with no Location`))
        const next = loc.startsWith('/') ? new URL(loc, url).href : loc
        return download(next, redirects + 1).then(resolve).catch(reject)
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

function sanitizeFilename(url) {
  const ext = (url.split('?')[0].match(/\.(jpe?g|png|webp|gif)/i) || ['.jpg'])[0].toLowerCase()
  const base = url.split('/').pop().split('?')[0]
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 60)
  return `found_${base}_${Date.now()}${ext}`
}

async function main() {
  const csvPath = process.argv.find(a => a.endsWith('.csv'))
  if (!csvPath) {
    console.log('Usage: node import-found-images.js <path-to-csv> [--apply]')
    return
  }

  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'))
  console.log(`Parsed ${rows.length} products from CSV`)

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

  let success = 0, failed = 0, skipped = 0

  for (const row of rows) {
    process.stdout.write(`  ${row.productId} ${row.name.slice(0, 40)}... `)

    try {
      const buffer = await download(row.imageUrl)
      if (buffer.length < 500) throw new Error('Too small')
      if (!isImageBuffer(buffer)) throw new Error('Not a valid image')

      if (!APPLY) {
        console.log(`OK (${(buffer.length / 1024).toFixed(0)}KB) [dry run]`)
        success++
        continue
      }

      const filename = sanitizeFilename(row.imageUrl)
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer)
      const newUrl = `${BASE_URL}/api/admin/media/serve/${encodeURIComponent(filename)}`

      await prisma.productImage.create({
        data: { url: newUrl, productId: row.productId, alt: row.name },
      })
      console.log(`OK (${(buffer.length / 1024).toFixed(0)}KB)`)
      success++
    } catch (err) {
      console.log(`FAILED: ${err.message}`)
      failed++
    }

    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n--- DONE ---`)
  console.log(`Success: ${success}`)
  console.log(`Failed:  ${failed}`)
  if (!APPLY && success > 0) console.log(`\nDry run — no files saved. Run with --apply to import.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
