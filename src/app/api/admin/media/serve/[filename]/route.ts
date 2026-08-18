import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media')

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  // Now also serving uploads that used to go to Cloudinary — product PDFs,
  // sell-animal videos, payment screenshots, etc. (see src/lib/localStorage.ts)
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  // Prevent path traversal
  const safeName = path.basename(filename)
  const filePath = path.join(UPLOAD_DIR, safeName)

  if (!existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext = safeName.split('.').pop()?.toLowerCase() ?? ''
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

  const buffer = await readFile(filePath)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
