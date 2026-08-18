import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

// Saves uploads to the VPS's own disk instead of Cloudinary. Reuses the
// same uploads/media/ folder + /api/admin/media/serve/[filename] route that
// already exists (and is already wired into nginx to bypass Node, and
// already allowed in robots.txt) — see migrate-images.js's header comment
// and tech_reference memory for that prior work. This just makes every
// upload flow use it going forward instead of only a one-time backfill.
//
// src/lib/cloudinary.ts now just re-exports this file, so every existing
// caller (product/partner/company/banner/news/job/sell-animal uploads, etc.)
// keeps working unchanged — same function names, same {secure_url, public_id}
// shape, same argument order.

export interface LocalUploadResult {
  secure_url: string
  public_id: string
  [key: string]: string | number | boolean
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media')
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10MB, same cap the Cloudinary free plan enforced
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://animalwellness.shop'

function sanitizeBaseName(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '') // strip extension
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 60)
}

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

async function saveFile(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw',
  originalFileName?: string
): Promise<LocalUploadResult> {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Maximum allowed is 10MB.`
    )
  }

  await ensureUploadDir()

  const base = originalFileName ? sanitizeBaseName(originalFileName) : `file-${Date.now()}`
  const extFromName = originalFileName?.split('.').pop()?.toLowerCase()
  const extension = extFromName || (resourceType === 'image' ? 'jpg' : 'bin')
  // folder prefix keeps filenames readable/traceable (e.g. "products-tylosin-...")
  // without needing real subdirectories, so the flat serve route's
  // path.basename lookup keeps working unchanged.
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  const filename = `${folder}-${base}-${uniqueSuffix}.${extension}`

  await writeFile(path.join(UPLOAD_DIR, filename), buffer)

  return {
    secure_url: `${BASE_URL}/api/admin/media/serve/${encodeURIComponent(filename)}`,
    public_id: filename,
  }
}

export async function uploadFileToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' = 'image',
  originalFileName?: string
): Promise<LocalUploadResult> {
  return saveFile(buffer, folder, resourceType, originalFileName)
}

export async function uploadImage(
  buffer: Buffer,
  folder: string,
  originalFileName?: string
): Promise<LocalUploadResult> {
  return saveFile(buffer, folder, 'image', originalFileName)
}

export async function uploadPDF(
  buffer: Buffer,
  folder: string,
  originalFileName?: string
): Promise<LocalUploadResult> {
  return saveFile(buffer, folder, 'raw', originalFileName)
}

export async function uploadRawFile(
  buffer: Buffer,
  folder: string,
  originalFileName?: string
): Promise<LocalUploadResult> {
  return saveFile(buffer, folder, 'raw', originalFileName)
}

// resourceType is accepted (some callers pass 'video', 'raw', etc.) but
// unused — local deletion only needs the filename (public_id).
export async function deleteFromCloudinary(publicId: string, _resourceType: string = 'image') {
  try {
    const filePath = path.join(UPLOAD_DIR, path.basename(publicId))
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
    return { result: 'ok' }
  } catch (error) {
    console.error('[localStorage] Failed to delete file:', publicId, error)
    return { result: 'error' }
  }
}
