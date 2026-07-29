// Bulk description generator — run on VPS: node bulk-descriptions.js
// Batches 15 products per Groq API call. All 2719 products = ~181 calls.
// Saves progress after every batch. Safe to Ctrl+C and resume.

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()
const PROGRESS_FILE = 'bulk-descriptions-progress.json'
const BATCH_SIZE = 15
const DELAY_MS = 3000        // 3 seconds between calls → well under 30 RPM limit
const RETRY_DELAY_MS = 30000 // 30 seconds on rate-limit error

// ─── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
    }
  } catch {}
  return { completedIds: [], failedIds: [] }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// ─── Groq API call ────────────────────────────────────────────────────────────

async function generateBatch(products, attempt = 1) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set in .env')

  const productList = products.map(p =>
    `ID ${p.id}: "${p.productName}"${p.genericName && p.genericName !== 'Veterinary' && p.genericName !== 'NULL' ? ` (${p.genericName})` : ''}` +
    `${p.category ? ` | Category: ${p.category}` : ''}` +
    `${p.company?.companyName ? ` | Brand: ${p.company.companyName}` : ''}` +
    `${p.description && p.description.length > 10 ? ` | Current info: ${p.description.slice(0, 100)}` : ''}`
  ).join('\n')

  const prompt = `You are a professional copywriter for AnimalWellness.shop, a veterinary and pet care e-commerce store serving Pakistan and UAE.

Write a unique, accurate product description for each of the following ${products.length} products. Each description must be 150–180 words, written in clear English, informative, and specific to that exact product.

Products:
${productList}

Return ONLY a valid JSON object in this exact format — no markdown, no explanation:
{
  "ID_1": "description for product 1...",
  "ID_2": "description for product 2...",
  ...
}

Replace ID_1, ID_2 etc with the actual numeric IDs from the list above.`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (res.status === 429) {
    if (attempt <= 3) {
      console.log(`  Rate limited. Waiting ${RETRY_DELAY_MS / 1000}s before retry ${attempt}/3...`)
      await sleep(RETRY_DELAY_MS)
      return generateBatch(products, attempt + 1)
    }
    throw new Error('Rate limit hit 3 times in a row — stop and try again later')
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Extract JSON from response (handle potential markdown wrapping)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`No JSON in response: ${content.slice(0, 200)}`)

  const parsed = JSON.parse(jsonMatch[0])
  return parsed
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading products with thin descriptions from database...')

  // Get empty descriptions
  const emptyProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [{ description: null }, { description: '' }],
    },
    select: {
      id: true, productName: true, genericName: true,
      category: true, description: true,
      company: { select: { companyName: true } },
    },
    orderBy: { id: 'asc' },
  })

  // Get thin descriptions via raw SQL
  const thinRaw = await prisma.$queryRaw`
    SELECT id FROM Product
    WHERE isActive = 1
      AND description IS NOT NULL
      AND description != ''
      AND CHAR_LENGTH(description) < 150
    ORDER BY id ASC
  `

  const thinIds = thinRaw.map(r => r.id)
  const thinProducts = thinIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: thinIds } },
        select: {
          id: true, productName: true, genericName: true,
          category: true, description: true,
          company: { select: { companyName: true } },
        },
        orderBy: { id: 'asc' },
      })
    : []

  const allProducts = [...emptyProducts, ...thinProducts]
  console.log(`Found ${allProducts.length} products needing descriptions (${emptyProducts.length} empty + ${thinProducts.length} thin)`)

  // Load progress — skip already completed IDs
  const progress = loadProgress()
  const completedSet = new Set(progress.completedIds)
  const pending = allProducts.filter(p => !completedSet.has(p.id))

  console.log(`Already done: ${progress.completedIds.length} | Remaining: ${pending.length}`)
  if (pending.length === 0) {
    console.log('All products already processed!')
    return
  }

  // Split into batches
  const batches = []
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE))
  }

  console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} products each...\n`)

  let totalUpdated = 0
  let totalFailed = 0

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]
    const batchNum = b + 1
    process.stdout.write(`Batch ${batchNum}/${batches.length} (${batch.length} products)... `)

    try {
      const descriptions = await generateBatch(batch)

      let batchUpdated = 0
      let batchFailed = 0

      for (const product of batch) {
        const desc = descriptions[String(product.id)] || descriptions[`ID_${product.id}`]
        if (desc && desc.trim().length >= 80) {
          await prisma.product.update({
            where: { id: product.id },
            data: { description: desc.trim() },
          })
          progress.completedIds.push(product.id)
          batchUpdated++
        } else {
          progress.failedIds.push(product.id)
          batchFailed++
        }
      }

      saveProgress(progress)
      totalUpdated += batchUpdated
      totalFailed += batchFailed
      console.log(`✓ ${batchUpdated} updated, ${batchFailed} failed | Total: ${totalUpdated} done`)

    } catch (err) {
      console.log(`✗ FAILED — ${err.message}`)
      batch.forEach(p => progress.failedIds.push(p.id))
      saveProgress(progress)
      totalFailed += batch.length

      if (err.message.includes('Rate limit hit 3 times')) {
        console.log('\nStopping due to persistent rate limit. Run again tomorrow.')
        break
      }
    }

    // Delay between batches (skip after last batch)
    if (b < batches.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Done. Updated: ${totalUpdated} | Failed: ${totalFailed}`)
  console.log(`Progress saved to ${PROGRESS_FILE}`)
  if (totalFailed > 0) {
    console.log(`Run again to retry ${totalFailed} failed products.`)
  }
}

main()
  .catch(err => { console.error('Fatal:', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
