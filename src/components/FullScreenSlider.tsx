// components/FullScreenSlider.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import axios from "axios"
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-client"

interface BannerImage {
  url: string
  alt: string
  publicId: string | null
}

interface Banner {
  id: number
  position: number
  image: BannerImage | null
}

export default function FullScreenSlider() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [current, setCurrent] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const delay = 5000 // milliseconds

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setIsLoading(true)
        const { data } = await axios.get('/api/banner', {
          params: {
            limit: 'all',
            sortOrder: 'asc'
          }
        })
        
        const validBanners = data.data.filter((banner: Banner) => banner.image?.url)
        
        if (validBanners.length === 0) {
          setError("No banners available")
        } else {
          setBanners(validBanners)
          setError(null)
        }
      } catch (error) {
        console.error('Error fetching banners:', error)
        setError("Failed to load banners")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBanners()
  }, [])

  const nextSlide = () => {
    if (banners.length > 0) {
      setCurrent((prev) => (prev + 1) % banners.length)
    }
  }

  const prevSlide = () => {
    if (banners.length > 0) {
      setCurrent((prev) => (prev - 1 + banners.length) % banners.length)
    }
  }

  useEffect(() => {
    if (banners.length > 1) {
      timeoutRef.current = setTimeout(() => {
        nextSlide()
      }, delay)

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }
  }, [current, banners.length])

  // Container classes for consistent sizing
const containerClasses = "absolute inset-0 w-full h-full"
  // Loading state
  if (isLoading) {
    return (
      <div className={containerClasses}>
        <Image
          src="/fallback-slider.jpg"
          alt="Loading"
          layout="fill"
          objectFit="cover"
          objectPosition="center"
          priority
        />
       
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`${containerClasses} flex items-center justify-center bg-gray-100 dark:bg-zinc-800`}>
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-green-500 hover:text-green-600 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // No banners state
  if (banners.length === 0) {
    return (
      <div className={`${containerClasses} flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-900`}>
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No banners to display</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Please add banners from the admin dashboard</p>
        </div>
      </div>
    )
  }

  // Single banner (no navigation needed)
  if (banners.length === 1) {
    return (
      <div className={containerClasses}>
        <Image
          src={optimizeCloudinaryUrl(banners[0].image!.url, { 
            width: 1920, 
            height: 1080, 
            quality: 75,
            format: 'auto',
            crop: 'fill'
          })}
          alt={banners[0].image!.alt}
          layout="fill"
          objectFit="cover"
          objectPosition="center"
          priority
          sizes="100vw"
        />
      </div>
    )
  }

  // Multiple banners with navigation
  return (
    <div className={`${containerClasses} group`}>
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {banner.image && (
            <Image
              src={optimizeCloudinaryUrl(banner.image.url, { 
                width: 1920, 
                height: 1080, 
                quality: 75,
                format: 'auto',
                crop: 'fill'
              })}
              alt={banner.image.alt}
              layout="fill"
              objectFit="cover"
              objectPosition="center"
              className="transition-all duration-1000"
              priority={index === 0}
              sizes="100vw"
            />
          )}
          
          {/* Optional overlay - only shows on hover */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 sm:p-6 lg:p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-white text-sm sm:text-base lg:text-lg font-medium">
              {banner.image?.alt}
            </p>
          </div>
        </div>
      ))}

      {/* Navigation Buttons - Responsive sizing */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-2 sm:p-3 rounded-full hover:bg-black/70 transition z-20 opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-2 sm:p-3 rounded-full hover:bg-black/70 transition z-20 opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Slide Indicators - Always visible on mobile, hover on desktop */}
      <div className="absolute bottom-2 sm:bottom-4 w-full flex justify-center gap-2 z-20">
        {banners.map((_, idx) => (
          <button
            key={idx}
            className={`h-6 w-6 sm:h-8 sm:w-8 p-2 rounded-full transition-all flex items-center justify-center ${
              idx === current 
                ? "bg-white/20" 
                : "bg-white/10 hover:bg-white/20"
            }`}
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          >
            <div className={`rounded-full transition-all ${
              idx === current 
                ? "bg-white h-2 w-4 sm:h-3 sm:w-6" 
                : "bg-white/60 h-1.5 w-1.5 sm:h-2 sm:w-2"
            }`} />
          </button>
        ))}
      </div>

      {/* Slide counter - Hidden on mobile */}
      <div className="hidden sm:block absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        {current + 1} / {banners.length}
      </div>
    </div>
  )
}