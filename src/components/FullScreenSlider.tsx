// components/FullScreenSlider.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import axios from "axios"

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
            limit: 'all', // Get all banners
            sortOrder: 'asc' // Sort by position ascending
          }
        })
        
        // Filter out banners without images
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

  // Auto-advance slider
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

  // Loading state
  if (isLoading) {
    return (
      <div className="relative h-[50vh] lg:w-screen lg:h-screen overflow-hidden flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading banners...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="relative h-[50vh] lg:w-screen lg:h-screen overflow-hidden flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-2">{error}</p>
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
      <div className="relative h-[50vh] lg:w-screen lg:h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="text-center">
          <p className="text-gray-600 text-lg">No banners to display</p>
          <p className="text-gray-500 text-sm mt-2">Please add banners from the admin dashboard</p>
        </div>
      </div>
    )
  }

  // Single banner (no navigation needed)
  if (banners.length === 1) {
    return (
      <div className="relative h-[50vh] lg:w-screen lg:h-screen overflow-hidden">
        <Image
          src={banners[0].image!.url}
          alt={banners[0].image!.alt}
          layout="fill"
          objectFit="contain"
          priority
        />
      </div>
    )
  }

  // Multiple banners with navigation
  return (
    <div className="relative h-[50vh] lg:w-screen lg:h-screen overflow-hidden group">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {banner.image && (
            <Image
              src={banner.image.url}
              alt={banner.image.alt}
              layout="fill"
              objectFit="cover"
              className="transition-all duration-1000"
              priority={index === 0}
            />
          )}
          
          {/* Optional: Add caption/overlay if needed */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-white text-lg font-medium">
              {banner.image?.alt}
            </p>
          </div>
        </div>
      ))}

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/70 transition z-20 opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/70 transition z-20 opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 w-full flex justify-center gap-2 z-20">
        {banners.map((_, idx) => (
          <button
            key={idx}
            className={`w-3 h-3 rounded-full transition-all ${
              idx === current 
                ? "bg-white w-8" 
                : "bg-white/40 hover:bg-white/60"
            }`}
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Optional: Slide counter */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-20">
        {current + 1} / {banners.length}
      </div>
    </div>
  )
}