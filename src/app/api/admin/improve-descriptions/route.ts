import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const DAILY_LIMIT = 100
const BATCH_SIZE = 20
const STATE_FILE = path.join(process.cwd(), 'improve-descriptions-state.json')

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
      if (s.date === getTodayStr()) return s
    }
  } catch {}
  return { date: getTodayStr(), processedToday: 0, totalImproved: 0 }
}

function saveState(state: { date: string; processedToday: number; totalImproved: number }) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

async function generateDescription(product: {
  productName: string
  genericName: string | null
  category: string | null
  subCategory: string | null
  company: { companyName: string | null } | null
  description: string | null
}): Promise<string | null> {
  const currentInfo = product.description
    ? `Current brief info: ${product.description.slice(0, 200)}`
    : ''

  const prompt = `You are a professional copywriter for an animal health and veterinary e-commerce store serving Pakistan and UAE.

Write a product description for:
- Product: ${product.productName}${product.genericName ? ` (${product.genericName})` : ''}
- Category: ${[product.category, product.subCategory].filter(Boolean).join(' > ')}
- Brand: ${product.company?.companyName || 'Unknown'}
${currentInfo}

Requirements:
- 150-200 words
- Professional and informative
- Highlight key benefits and uses for pet owners or veterinarians
- Do not make specific medical claims or invent dosage instructions
- Write in English only
- Return ONLY the description text with no headings or labels`

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Grok API error:', res.status, err)
    return null
  }
  const json = await res.json()
  return json.choices?.[0]?.message?.content?.trim() ?? null
}

type ProductRow = {
  id: number
  productName: string
  genericName: string | null
  category: string | null
  subCategory: string | null
  description: string | null
  company: { companyName: string | null } | null
}

async function getProductsBatch(limit: number): Promise<ProductRow[]> {
  // First: products with no description at all
  const empty = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [{ description: null }, { description: '' }],
    },
    select: {
      id: true,
      productName: true,
      genericName: true,
      category: true,
      subCategory: true,
      description: true,
      company: { select: { companyName: true } },
    },
    take: limit,
    orderBy: { id: 'asc' },
  })

  if (empty.length >= limit) return empty

  // Then: products with thin description (< 150 chars), excluding already-fetched IDs
  const needed = limit - empty.length
  const emptyIds = empty.map(p => p.id)

  const thinRaw = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM Product
    WHERE isActive = 1
      AND description IS NOT NULL
      AND description != ''
      AND CHAR_LENGTH(description) < 150
    ORDER BY id ASC
    LIMIT ${needed * 2}
  `

  const thinIds = thinRaw
    .map(r => r.id)
    .filter(id => !emptyIds.includes(id))
    .slice(0, needed)

  if (thinIds.length === 0) return empty

  const thinProducts = await prisma.product.findMany({
    where: { id: { in: thinIds } },
    select: {
      id: true,
      productName: true,
      genericName: true,
      category: true,
      subCategory: true,
      description: true,
      company: { select: { companyName: true } },
    },
    orderBy: { id: 'asc' },
  })

  return [...empty, ...thinProducts]
}

export async function GET() {
  const state = loadState()

  const [emptyCount, thinRaw] = await Promise.all([
    prisma.product.count({
      where: {
        isActive: true,
        OR: [{ description: null }, { description: '' }],
      },
    }),
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*) as cnt FROM Product
      WHERE isActive = 1
        AND description IS NOT NULL
        AND description != ''
        AND CHAR_LENGTH(description) < 150
    `,
  ])

  const thinCount = Number(thinRaw[0]?.cnt ?? 0)

  return NextResponse.json({
    processedToday: state.processedToday,
    totalImproved: state.totalImproved,
    dailyLimit: DAILY_LIMIT,
    remainingToday: Math.max(0, DAILY_LIMIT - state.processedToday),
    pendingProducts: emptyCount + thinCount,
    emptyDescriptions: emptyCount,
    thinDescriptions: thinCount,
    batchSize: BATCH_SIZE,
  })
}

export async function POST() {
  const state = loadState()

  if (state.processedToday >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: 'Daily limit reached. Come back tomorrow.',
        processedToday: state.processedToday,
        dailyLimit: DAILY_LIMIT,
      },
      { status: 429 }
    )
  }

  const canProcess = Math.min(BATCH_SIZE, DAILY_LIMIT - state.processedToday)
  const products = await getProductsBatch(canProcess)

  if (products.length === 0) {
    return NextResponse.json({ message: 'No products need improvement!', results: [] })
  }

  const results: { id: number; name: string; status: 'improved' | 'failed'; reason?: string }[] =
    []

  for (const product of products) {
    const newDesc = await generateDescription(product)
    if (newDesc && newDesc.length >= 100) {
      await prisma.product.update({
        where: { id: product.id },
        data: { description: newDesc },
      })
      results.push({ id: product.id, name: product.productName, status: 'improved' })
      state.processedToday++
      state.totalImproved++
    } else {
      results.push({
        id: product.id,
        name: product.productName,
        status: 'failed',
        reason: newDesc ? 'Response too short' : 'API error',
      })
    }
    saveState(state)
  }

  return NextResponse.json({
    results,
    processedToday: state.processedToday,
    totalImproved: state.totalImproved,
    dailyLimit: DAILY_LIMIT,
    remainingToday: Math.max(0, DAILY_LIMIT - state.processedToday),
  })
}
