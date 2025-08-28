"use client";

import { useEffect } from 'react';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-utils';

export function useImagePreloader(
  images: string[],
  options: {
    priority?: boolean;
    width?: number;
    height?: number;
    quality?: 'auto' | number;
  } = {}
) {
  useEffect(() => {
    if (!options.priority) return;

    const preloadImages = images.map(src => {
      const img = new Image();
      
      // Optimize Cloudinary URLs for preloading
      if (src.includes('res.cloudinary.com')) {
        img.src = optimizeCloudinaryUrl(src, {
          width: options.width,
          height: options.height,
          quality: options.quality || 'auto',
          format: 'auto'
        });
      } else {
        img.src = src;
      }

      return img;
    });

    // Cleanup function
    return () => {
      preloadImages.forEach(img => {
        img.src = '';
      });
    };
  }, [images, options.priority, options.width, options.height, options.quality]);
}

export function preloadImage(
  src: string, 
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve();
    img.onerror = reject;
    
    if (src.includes('res.cloudinary.com')) {
      img.src = optimizeCloudinaryUrl(src, {
        width: options.width,
        height: options.height,
        quality: options.quality || 'auto',
        format: 'auto'
      });
    } else {
      img.src = src;
    }
  });
}