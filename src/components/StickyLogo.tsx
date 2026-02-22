'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import axios from 'axios'
import { useCountry } from '@/contexts/CountryContext'

interface Company {
  id: number
  companyName: string
  image: { url: string; alt: string } | null
}

interface StickyLogo {
  id: number
  companyId: number
  isActive: boolean
  company: Company
}

export default function StickyLogo() {
  const [stickyLogos, setStickyLogos] = useState<StickyLogo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { country } = useCountry()

  useEffect(() => {
    const fetchStickyLogos = async () => {
      setIsLoading(true)
      setStickyLogos([])
      try {
        const { data } = await axios.get('/api/sticky-logo', {
          params: { country },
        })
        setStickyLogos(data.data || [])
      } catch (error) {
        console.log('Error fetching sticky logos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStickyLogos()
  }, [country])

  if (isLoading || stickyLogos.length === 0) {
    return null
  }

  // Filter logos that have images
  const validLogos = stickyLogos.filter(logo => logo.company.image)

  if (validLogos.length === 0) {
    return null
  }

  // Calculate dynamic size based on number of logos
  const getLogoSize = () => {
    const count = validLogos.length
    if (count === 1) return 'w-16 h-16 md:w-20 md:h-20'
    if (count === 2) return 'w-14 h-14 md:w-16 md:h-16'
    if (count <= 4) return 'w-12 h-12 md:w-14 md:h-14'
    if (count <= 7) return 'w-10 h-10 md:w-12 md:h-12'
    return 'w-8 h-8 md:w-10 md:h-10'
  }

  const getPadding = () => {
    const count = validLogos.length
    if (count <= 2) return 'p-3'
    if (count <= 5) return 'p-2'
    return 'p-1.5'
  }

  const getGap = () => {
    const count = validLogos.length
    if (count <= 3) return 'gap-4'
    if (count <= 6) return 'gap-3'
    return 'gap-2'
  }

  const getBadgeSize = () => {
    const count = validLogos.length
    if (count <= 3) return 'text-xs px-2 py-1'
    if (count <= 7) return 'text-[10px] px-1.5 py-0.5'
    return 'text-[8px] px-1 py-0.5'
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col ${getGap()} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      {validLogos.map((logo, index) => (
        <Link
          key={logo.id}
          href={`/Companies/${logo.companyId}`}
          className="block group"
          aria-label={`Visit ${logo.company.companyName}`}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <div className={`relative bg-white dark:bg-zinc-800 rounded-full ${getPadding()} shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-green-500 hover:border-green-600 group-hover:scale-110`}>
            <div className={`relative ${getLogoSize()}`}>
              <Image
                src={logo.company.image!.url}
                alt={logo.company.image!.alt}
                fill
                className="object-contain rounded-full"
                priority={index === 0}
              />
            </div>
            <div className={`absolute -top-1 -right-1 bg-green-500 text-white ${getBadgeSize()} rounded-full shadow-md`}>
              Partner
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
