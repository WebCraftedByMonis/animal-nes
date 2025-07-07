'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MapPin, Mail, Tag, ShoppingCart, Calendar, Scale } from 'lucide-react'
import AddAnimalToCartButton from '@/components/AnimalCartButton'

interface SellAnimal {
  id: number
  specie: string
  breed: string
  location: string
  quantity: number
  ageType: string
  ageNumber: number
  weightType: string
  weightValue: number
  gender: string
  healthCertificate: boolean
  totalPrice: number
  purchasePrice: number
  referredBy: string | null
  status: string
  createdAt: string
  user: {
    name: string
    email: string
  }
  images: { id: number; url: string; alt: string }[]
  videos: { id: number; url: string; alt: string }[]
}

export default function AnimalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [animal, setAnimal] = useState<SellAnimal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchAnimal = async () => {
      try {
        const numericId = parseInt(id)
        if (isNaN(numericId)) {
          console.error('Invalid ID')
          return
        }

        const { data } = await axios.get(`/api/sell-animal/${numericId}`)
        setAnimal(data)
      } catch (error) {
        console.error('Error fetching animal details', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnimal()
  }, [id])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <Skeleton className="w-full h-[400px] rounded-xl mb-4 animate-pulse" />
        <Skeleton className="h-8 w-1/3 rounded-md" />
        <Skeleton className="h-6 w-2/3 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
    )
  }

  if (!animal) {
    return <div className="text-center text-red-500 p-10 text-lg">Animal not found</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Show first image only */}
      {animal.images.length > 0 && (
        <div className="rounded-xl overflow-hidden shadow-md">
          <div className="relative w-full h-[350px]">
            <Image
              src={animal.images[0].url}
              alt={animal.images[0].alt}
              fill
              className="object-cover"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Title & Badges */}
      <div>
        <h1 className="text-3xl font-bold mb-3 text-gray-900">{animal.specie} - {animal.breed}</h1>
        <div className="flex flex-wrap gap-3">
          <Badge className="bg-green-600 text-white text-sm px-3 py-1">
            PKR {animal.totalPrice.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {animal.gender}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {animal.quantity} Available
          </Badge>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-700">
        <div className="space-y-3">
          <p><MapPin className="inline mr-2 text-green-600" /> <span className="font-semibold">Location:</span> {animal.location}</p>
          <p><Scale className="inline mr-2 text-green-600" /> <span className="font-semibold">Weight:</span> {animal.weightValue} {animal.weightType}</p>
          <p><Calendar className="inline mr-2 text-green-600" /> <span className="font-semibold">Age:</span> {animal.ageNumber} {animal.ageType}</p>
        </div>
       
      </div>

      {/* Buttons */}
      <div className="flex flex-col md:flex-row gap-4">
      <AddAnimalToCartButton animalId={animal.id} />

       
      </div>
    </div>
  )
}
