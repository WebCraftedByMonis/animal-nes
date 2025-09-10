import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  [key: string]: string | number | boolean
}

export interface CloudinaryError {
  message: string
  [key: string]: unknown
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

/**
 * Sanitizes a filename for use as a Cloudinary public_id
 */
function sanitizePublicId(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9\-_]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase()
}

/**
 * Uploads a file buffer to Cloudinary.
 */
export async function uploadFileToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' = 'image',
  originalFileName?: string
): Promise<CloudinaryUploadResult> {
  const baseFileName = originalFileName
    ? sanitizePublicId(originalFileName)
    : `file-${Date.now()}`

  const extension = originalFileName?.split('.').pop()?.toLowerCase()
  const publicId = `${baseFileName}-${Date.now()}`

  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      resource_type: resourceType,
      public_id: publicId,
      use_filename: false,
      unique_filename: false,
    }

    // Only set format for non-raw files or when extension is known
    if (resourceType === 'image' || (resourceType === 'raw' && extension)) {
      uploadOptions.format = extension
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(new Error(error.message))
        }
        if (!result) {
          return reject(new Error('No result from Cloudinary'))
        }
        resolve(result as CloudinaryUploadResult)
      }
    )

    uploadStream.end(buffer)
  })
}

/**
 * Uploads an image file to Cloudinary
 */
export async function uploadImage(
  buffer: Buffer,
  folder: string,
  originalFileName?: string
): Promise<CloudinaryUploadResult> {
  return uploadFileToCloudinary(buffer, folder, 'image', originalFileName)
}

/**
 * Uploads a PDF file to Cloudinary
 */
export async function uploadPDF(
  buffer: Buffer,
  folder: string,
  originalFileName?: string
): Promise<CloudinaryUploadResult> {
  return uploadFileToCloudinary(buffer, folder, 'raw', originalFileName)
}

/**
 * Uploads any raw file to Cloudinary
 */
export async function uploadRawFile(
  buffer: Buffer,
  folder: string,
  originalFileName?: string
): Promise<CloudinaryUploadResult> {
  return uploadFileToCloudinary(buffer, folder, 'raw', originalFileName)
}

/**
 * Deletes a file from Cloudinary.
 */
export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'raw' = 'image') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}
