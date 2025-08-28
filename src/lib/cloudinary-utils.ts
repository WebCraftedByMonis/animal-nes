// Cloudinary optimization utilities for free plan users

export function optimizeCloudinaryUrl(
  url: string,
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
  if (!url.includes('res.cloudinary.com')) {
    return url;
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
  return url.replace('/upload/', `/upload/${transformString}/`);
}

export function getResponsiveCloudinaryUrl(
  url: string,
  sizes: { width: number; height?: number }[]
): { src: string; srcSet: string } {
  if (!url.includes('res.cloudinary.com')) {
    return { src: url, srcSet: '' };
  }

  const srcSet = sizes
    .map(({ width, height }) => {
      const optimizedUrl = optimizeCloudinaryUrl(url, {
        width,
        height,
        quality: 'auto',
        format: 'auto',
      });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');

  const src = optimizeCloudinaryUrl(url, {
    width: sizes[0].width,
    height: sizes[0].height,
    quality: 'auto',
    format: 'auto',
  });

  return { src, srcSet };
}

// Presets for common use cases
export const cloudinaryPresets = {
  thumbnail: (url: string) => optimizeCloudinaryUrl(url, {
    width: 150,
    height: 150,
    quality: 'auto',
    format: 'auto',
    crop: 'fill',
    gravity: 'auto'
  }),
  
  avatar: (url: string) => optimizeCloudinaryUrl(url, {
    width: 100,
    height: 100,
    quality: 'auto',
    format: 'auto',
    crop: 'fill',
    gravity: 'face'
  }),
  
  card: (url: string) => optimizeCloudinaryUrl(url, {
    width: 400,
    height: 300,
    quality: 'auto',
    format: 'auto',
    crop: 'fill',
    gravity: 'auto'
  }),
  
  hero: (url: string) => optimizeCloudinaryUrl(url, {
    width: 1920,
    height: 1080,
    quality: 80,
    format: 'auto',
    crop: 'fill',
    gravity: 'auto'
  })
};