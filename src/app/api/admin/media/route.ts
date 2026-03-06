import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 60

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'media')

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

function sanitizeFilename(name: string): string {
  const ext = path.extname(name)
  const base = path.basename(name, ext)
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
  const timestamp = Date.now()
  return `${base}-${timestamp}${ext.toLowerCase()}`
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir()

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const safeName = sanitizeFilename(file.name)
        const filePath = path.join(UPLOAD_DIR, safeName)
        const arrayBuffer = await file.arrayBuffer()
        await writeFile(filePath, Buffer.from(arrayBuffer))
        return {
          filename: file.name,
          url: `/uploads/media/${safeName}`,
        }
      })
    )

    const uploaded: { filename: string; url: string }[] = []
    const failed: { filename: string; error: string }[] = []

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        uploaded.push(result.value)
      } else {
        failed.push({
          filename: files[i].name,
          error: result.reason?.message || 'Upload failed',
        })
      }
    })

    return NextResponse.json({ uploaded, failed })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 })
  }
}
