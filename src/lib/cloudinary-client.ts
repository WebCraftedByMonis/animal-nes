/**
 * Client-side Cloudinary URL optimization utilities
 * These functions work in the browser without Node.js dependencies
 */

/**
 * Transform Cloudinary URLs for optimal performance
 * Since we have `unoptimized: true`, we need to manually optimize Cloudinary images
 */
export function optimizeCloudinaryUrl(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
    gravity?: 'auto' | 'face' | 'center';
  } = {}
): string {
  // Check if it's a Cloudinary URL
  if (!originalUrl.includes('res.cloudinary.com')) {
    return originalUrl;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto'
  } = options;

  // Build transformation string
  const transformations = [];
  
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (gravity && crop !== 'scale') transformations.push(`g_${gravity}`);

  const transformString = transformations.join(',');

  // Insert transformations into URL
  return originalUrl.replace('/upload/', `/upload/${transformString}/`);
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