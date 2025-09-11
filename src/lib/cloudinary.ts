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

/**
 * Transform Cloudinary URLs for optimal performance
 * Since we have `unoptimized: true`, we need to manually optimize Cloudinary images
 */
export function optimizeCloudinaryUrl(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
  } = {}
): string {
  // Check if it's a Cloudinary URL
  if (!originalUrl.includes('res.cloudinary.com')) {
    return originalUrl;
  }

  const {
    width,
    height,
    quality = 75,
    format = 'auto',
    crop = 'fill'
  } = options;

  // Extract the public ID from the URL
  const urlParts = originalUrl.split('/');
  const uploadIndex = urlParts.findIndex(part => part === 'upload');
  
  if (uploadIndex === -1) {
    return originalUrl;
  }

  // Build transformations
  const transformations = [];
  
  // Format and quality
  transformations.push(`f_${format}`);
  transformations.push(`q_${quality}`);
  
  // Dimensions
  if (width && height) {
    transformations.push(`w_${width},h_${height},c_${crop}`);
  } else if (width) {
    transformations.push(`w_${width}`);
  } else if (height) {
    transformations.push(`h_${height}`);
  }

  // Auto optimize
  transformations.push('fl_progressive');
  transformations.push('fl_lossy');

  // Reconstruct URL with transformations
  const baseUrl = urlParts.slice(0, uploadIndex + 1).join('/');
  const publicIdAndExtension = urlParts.slice(uploadIndex + 1).join('/');
  
  return `${baseUrl}/${transformations.join(',')}/${publicIdAndExtension}`;
}

/**
 * Get responsive image URLs for different screen sizes
 */
export function getResponsiveCloudinaryUrls(originalUrl: string) {
  return {
    mobile: optimizeCloudinaryUrl(originalUrl, { width: 640, height: 360, quality: 70 }),
    tablet: optimizeCloudinaryUrl(originalUrl, { width: 1024, height: 576, quality: 75 }),
    desktop: optimizeCloudinaryUrl(originalUrl, { width: 1920, height: 1080, quality: 80 }),
    original: optimizeCloudinaryUrl(originalUrl, { quality: 75 })
  };
}
