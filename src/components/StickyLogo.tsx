'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import axios from 'axios'

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
  const [stickyLogo, setStickyLogo] = useState<StickyLogo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStickyLogo = async () => {
      try {
        const { data } = await axios.get('/api/sticky-logo')
        setStickyLogo(data.data)
      } catch (error) {
        console.log('Error fetching sticky logo:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStickyLogo()
  }, [])

  if (isLoading || !stickyLogo || !stickyLogo.company.image) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link
        href={`/Companies/${stickyLogo.companyId}`}
        className="block group"
        aria-label={`Visit ${stickyLogo.company.companyName}`}
      >
        <div className="relative bg-white dark:bg-zinc-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-green-500 hover:border-green-600 group-hover:scale-110">
          <div className="relative w-16 h-16 md:w-20 md:h-20">
            <Image
              src={stickyLogo.company.image.url}
              alt={stickyLogo.company.image.alt}
              fill
              className="object-contain rounded-full"
              priority
            />
          </div>
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
            Partner
          </div>
        </div>
      </Link>
    </div>
  )
}
