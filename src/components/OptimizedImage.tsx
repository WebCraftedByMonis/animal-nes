"use client";

import Image, { ImageProps } from "next/image";
import { useState, useMemo } from "react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-utils";

interface OptimizedImageProps extends Omit<ImageProps, 'quality' | 'loading'> {
  quality?: 'auto' | number;
  loading?: "lazy" | "eager";
  fallback?: string;
  showBlur?: boolean;
  cloudinaryOptions?: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
  };
}

export default function OptimizedImage({ 
  src, 
  alt, 
  quality = 'auto', 
  loading = "lazy", 
  fallback = "/placeholder.png",
  showBlur = true,
  className = "",
  cloudinaryOptions,
  width,
  height,
  ...props 
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Optimize Cloudinary URLs automatically
  const optimizedSrc = useMemo(() => {
    if (typeof src === 'string' && src.includes('res.cloudinary.com')) {
      return optimizeCloudinaryUrl(src, {
        width: typeof width === 'number' ? width : cloudinaryOptions?.width,
        height: typeof height === 'number' ? height : cloudinaryOptions?.height,
        quality: cloudinaryOptions?.quality || quality,
        format: cloudinaryOptions?.format || 'auto',
        crop: cloudinaryOptions?.crop || 'fill',
        ...cloudinaryOptions
      });
    }
    return src;
  }, [src, width, height, quality, cloudinaryOptions]);

  const [imgSrc, setImgSrc] = useState(optimizedSrc);

  return (
    <div className="relative">
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={`transition-opacity duration-300 ${
          isLoading && showBlur ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setImgSrc(fallback);
          setIsLoading(false);
        }}
        {...props}
      />
      
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      
      {/* Error indicator */}
      {hasError && (
        <div className="absolute bottom-1 right-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
          Error
        </div>
      )}
    </div>
  );
}