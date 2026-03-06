import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 60

// Store outside public/ — served via /api/admin/media/serve/[filename]
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media')

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
  return `${base}-${Date.now()}${ext.toLowerCase()}`
}

export async function GET() {
  try {
    await ensureUploadDir()
    const files = await readdir(UPLOAD_DIR)
    const images = await Promise.all(
      files
        .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
        .map(async (f) => {
          const s = await stat(path.join(UPLOAD_DIR, f))
          return {
            filename: f,
            url: `/api/admin/media/serve/${encodeURIComponent(f)}`,
            createdAt: s.mtimeMs,
          }
        })
    )
    images.sort((a, b) => b.createdAt - a.createdAt)
    return NextResponse.json({ images })
  } catch (error) {
    console.error('Media list error:', error)
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
  }
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
          url: `/api/admin/media/serve/${encodeURIComponent(safeName)}`,
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

export async function DELETE(request: NextRequest) {
  try {
    const { urls } = (await request.json()) as { urls: string[] }

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
    }

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        // url is like /api/admin/media/serve/filename.jpg
        const filename = decodeURIComponent(path.basename(url))
        const filePath = path.join(UPLOAD_DIR, filename)
        if (existsSync(filePath)) {
          await unlink(filePath)
        }
        return url
      })
    )

    const deleted: string[] = []
    const failedDelete: string[] = []

    results.forEach((result) => {
      if (result.status === 'fulfilled') deleted.push(result.value)
      else failedDelete.push(String(result.reason))
    })

    return NextResponse.json({ deleted, failed: failedDelete })
  } catch (error) {
    console.error('Media delete error:', error)
    return NextResponse.json({ error: 'Failed to delete images' }, { status: 500 })
  }
}
