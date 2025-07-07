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
 * Uploads a file buffer to Cloudinary.
 */
export async function uploadFileToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' = 'image',
  originalFileName?: string
): Promise<CloudinaryUploadResult> {
  const baseFileName = originalFileName
    ? originalFileName.replace(/\.[^/.]+$/, '')
    : `file-${Date.now()}`

  const extension = originalFileName?.split('.').pop() || 'pdf'
  const publicId = `${baseFileName}-${Date.now()}`

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        use_filename: true,
        unique_filename: false,
        format: extension,
      },
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
 * Deletes a file from Cloudinary.
 */
export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'raw' = 'image') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}
