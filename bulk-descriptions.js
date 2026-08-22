// Bulk description + category REWRITE — run on VPS: node bulk-descriptions.js
// Rewrites EVERY active-or-not product's description (not just empty/thin
// ones) into the 5-section structured format the product page already
// parses (see parseDescriptionSections in
// src/app/products/[categorySlug]/[productSlug]/page.tsx): an unheaded
// Overview paragraph, then "Benefits:", "Suitable For:",
// "Nutritional Information:" (feed/supplement products only), "Usage:".
// This replaces copied/duplicated supplier descriptions with unique,
// per-product text — the whole point of this pass.
//
// Also re-normalizes every product's category taxonomy in the same pass:
// a single primary `category` (drives the product's URL/canonical — see
// toProductUrl in src/lib/slug-utils.ts) plus 0–3 additional categories
// (ProductCategory join rows — see prisma/schema.prisma) written into the
// product page's other, non-canonical category listings. Both are chosen
// ONLY from CANONICAL_CATEGORIES below — never invented — because ~92% of
// the catalog's existing category values are either the single junk
// catch-all "Veterinary supplies online" or a scraped ingredient list/brand
// name, so there's no usable existing taxonomy to preserve.
//
// Batches 15 products per Groq API call. Saves progress after every batch —
// safe to Ctrl+C and resume. Uses its own progress file so it starts fresh
// and doesn't inherit "already done" state from the old thin/empty-only run.
// Free-tier Groq daily token cap means large catalogs take multiple days —
// just re-run this script daily (cron or manually) until it reports 0 pending.

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()
const PROGRESS_FILE = 'bulk-rewrite-progress.json'
const BATCH_SIZE = 15
const DELAY_MS = 3000        // 3 seconds between calls → well under 30 RPM limit
const RETRY_DELAY_MS = 30000 // 30 seconds on rate-limit error

// ─── canonical category taxonomy ───────────────────────────────────────────────
// Closed vocabulary — every product's category and additionalCategories must
// come from exactly these strings (case/whitespace normalized before
// matching). Grouped here for readability only; the model sees one flat list.
const CANONICAL_CATEGORIES = [
  // Species / animal type
  'Dog', 'Cat', 'Poultry', 'Cattle & Buffalo', 'Sheep & Goats', 'Equine',
  'Fisheries & Aquaculture', 'Birds', 'Exotic & Small Pets',
  // Medicine & health (function)
  'Vaccines & Immunologicals', 'Antibiotics & Antibacterials',
  'Antiparasitics & Dewormers', 'Anticoccidials', 'Pain Management / NSAIDs',
  'Reproductive Health / Hormones', 'Liver & Kidney Support',
  'Respiratory Health', 'Electrolytes & Hydration', 'Vitamins & Minerals',
  'Nutritional Supplements', 'Wound & Skin Care',
  'Feed Additives & Toxin Binders', 'Disinfectants & Hygiene',
  // Feed & food
  'Dog Food', 'Cat Food', 'Livestock Feed', 'Poultry Feed',
  'Aquaculture Feed', 'Treats',
  // Pet accessories
  'Grooming', 'Toys', 'Bedding & Housing', 'Leashes, Collars & Harnesses',
  'Bowls & Feeders', 'Litter & Hygiene', 'Travel Carriers & Cages',
  'Aquarium Equipment & Filtration',
  // Equestrian
  'Riding Apparel & Safety Gear', 'Saddlery & Tack',
  'Stable & Grooming Equipment', 'Equine Performance Supplements',
  // Other
  'Instruments & Equipment', 'Diagnostics', 'Herbal / Organic Products',
  // Fallback — only when nothing else above genuinely fits
  'General Veterinary Supplies',
]
const FALLBACK_CATEGORY = 'General Veterinary Supplies'

// Case/whitespace-insensitive lookup back to the canonical spelling — the
// model may echo a category in slightly different casing even when told not
// to, so match loosely and restore the exact stored string.
const CANONICAL_BY_LOWER = new Map(CANONICAL_CATEGORIES.map((c) => [c.toLowerCase(), c]))
function normalizeCategoryPick(raw) {
  if (!raw || typeof raw !== 'string') return null
  return CANONICAL_BY_LOWER.get(raw.trim().toLowerCase()) || null
}

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

  // "Current text/category" are given only as background context for what
  // the product actually is (many names/generics are terse or ambiguous) —
  // the prompt explicitly forbids reusing the description's wording or
  // inventing category names, since ~92% of current category values are a
  // single junk catch-all or a scraped ingredient list/brand name, not a
  // usable taxonomy.
  const productList = products.map(p =>
    `ID ${p.id}: "${p.productName}"${p.genericName && p.genericName !== 'Veterinary' && p.genericName !== 'NULL' ? ` (${p.genericName})` : ''}` +
    `${p.category ? ` | Current category (unreliable, background only): ${p.category}` : ''}` +
    `${p.subCategory ? ` | Sub-category: ${p.subCategory}` : ''}` +
    `${p.company?.companyName ? ` | Brand: ${p.company.companyName}` : ''}` +
    `${p.description && p.description.length > 10 ? ` | Current text (background only, DO NOT reuse its wording): ${p.description.slice(0, 150)}` : ''}`
  ).join('\n')

  const categoryList = CANONICAL_CATEGORIES.map((c) => `"${c}"`).join(', ')

  const prompt = `You are a professional copywriter and cataloger rewriting product data for AnimalWellness.shop, a veterinary and pet care e-commerce store serving Pakistan and UAE. Many current descriptions were copied from supplier sites and are duplicated across products, and current categories are almost all a single junk catch-all or scraped ingredient/brand text — your job is to replace both with fresh, unique, product-specific data.

For each of the following ${products.length} products, produce:

1. A DESCRIPTION using EXACTLY this structure and these section headers (each header on its own line, followed by a colon):
   a. Start with a plain paragraph (no header) — 2–3 sentences: what the product is, its active/generic ingredient if relevant, and its core purpose.
   b. "Benefits:" — 4 to 6 short, specific benefit statements (one per line, no header repeated).
   c. "Suitable For:" — 1–2 sentences naming the target species/animal type and use case.
   d. "Nutritional Information:" — ONLY include this section for feed, supplement, or nutrition products; a short list of key ingredients/composition. Omit this entire section (header and all) for medicines, instruments, accessories, or anything it doesn't apply to.
   e. "Usage:" — 1–2 sentences on frequency, route of administration, or how it's used.
   Total length: roughly 180–220 words across all sections combined. Each product's text must be genuinely different from the others — vary sentence structure and phrasing, not just swap the product name into a template. Never reuse the wording of the "Current text" shown for a product; treat it only as background on what the product is.

2. A CATEGORY classification, chosen ONLY from this exact closed list — do not invent new category names, do not use a brand name as a category, and do not reuse whatever "Current category" text is shown (it is unreliable):
   [${categoryList}]
   - "category": the single BEST-FIT category from the list above (required, exactly one).
   - "additionalCategories": 0 to 3 MORE categories from the same list that also genuinely apply (e.g. a cat vaccine gets category "Vaccines & Immunologicals" and additionalCategories ["Cat"]; a plain dog leash gets category "Leashes, Collars & Harnesses" and additionalCategories ["Dog"]). Leave empty if nothing else clearly applies — do not pad it.
   - Only use "General Veterinary Supplies" when truly nothing else in the list fits.

Products:
${productList}

Return ONLY a valid JSON object in this exact format — no markdown, no explanation. Use \\n for line breaks within the description string:
{
  "ID_1": {
    "description": "Overview paragraph...\\n\\nBenefits:\\n...\\n\\nSuitable For:\\n...\\n\\nUsage:\\n...",
    "category": "Vaccines & Immunologicals",
    "additionalCategories": ["Cat"]
  },
  "ID_2": { "description": "...", "category": "...", "additionalCategories": [] },
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
      temperature: 0.5,
      max_tokens: 7000,
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
  console.log('Loading all products from database for full rewrite...')

  // Every product, active or not — this is a full-catalog rewrite, not just
  // a fill-in-the-blanks pass, since the problem (copied/duplicated
  // descriptions) affects products that already have "full-length" text.
  const allProducts = await prisma.product.findMany({
    select: {
      id: true, productName: true, genericName: true,
      category: true, subCategory: true, description: true,
      company: { select: { companyName: true } },
    },
    orderBy: { id: 'asc' },
  })

  console.log(`Found ${allProducts.length} products to rewrite`)

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
      const results = await generateBatch(batch)

      let batchUpdated = 0
      let batchFailed = 0
      let batchBadCategory = 0

      for (const product of batch) {
        const result = results[String(product.id)] || results[`ID_${product.id}`]
        const desc = result?.description
        // Higher floor than the old thin-description pass (80 chars) since a
        // real structured output (overview + benefits + suitable-for +
        // usage) is always well over this — anything shorter is a truncated
        // or malformed generation, not a legitimately short description.
        const descOk = typeof desc === 'string' && desc.trim().length >= 200

        // Category must resolve to an exact canonical entry — reject (retry
        // next run) rather than accept an invented/mismatched category, since
        // consistency across the whole catalog is the point of this pass.
        const category = normalizeCategoryPick(result?.category) || (descOk ? FALLBACK_CATEGORY : null)
        const categoryOk = category !== null
        if (descOk && !normalizeCategoryPick(result?.category)) batchBadCategory++

        // Additional categories are lower-stakes — silently drop anything
        // that doesn't resolve or duplicates/equals the primary pick, rather
        // than failing the whole product over an optional field.
        const additionalCategories = Array.isArray(result?.additionalCategories)
          ? [...new Set(
              result.additionalCategories
                .map((c) => normalizeCategoryPick(c))
                .filter((c) => c && c !== category)
            )]
          : []

        if (descOk && categoryOk) {
          await prisma.$transaction(async (tx) => {
            await tx.product.update({
              where: { id: product.id },
              data: { description: desc.trim(), category },
            })
            await tx.productCategory.deleteMany({ where: { productId: product.id } })
            if (additionalCategories.length > 0) {
              await tx.productCategory.createMany({
                data: additionalCategories.map((c) => ({ productId: product.id, category: c })),
              })
            }
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
      console.log(`✓ ${batchUpdated} updated, ${batchFailed} failed${batchBadCategory > 0 ? ` (${batchBadCategory} fell back to "${FALLBACK_CATEGORY}")` : ''} | Total: ${totalUpdated} done`)

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
