'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MapPin, Mail, Tag, ShoppingCart, Calendar, Scale, Heart, ShieldCheck, User, Clock } from 'lucide-react'
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

export default function AnimalDetailClient() {
  const { id } = useParams<{ id: string }>()
  const [animal, setAnimal] = useState<SellAnimal | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)

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
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-white dark:bg-gray-900 ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Skeleton className="w-full h-[400px] rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-md bg-gray-200 dark:bg-gray-700" />
            ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!animal) {
  return (
    <div className="max-w-6xl mx-auto p-10 text-center bg-white  dark:bg-gray-900">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 inline-block">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Animal not shown</h2>
        <p className="text-red-500 dark:text-red-400">
          You must be logged in to see the animal.
        </p>
      </div>
    </div>
  )
}

  return (
   <div className="max-w-6xl mx-auto p-6 space-y-8 bg-white  dark:bg-gray-900 text-gray-900 dark:text-gray-100 ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative w-full h-96 rounded-xl overflow-hidden shadow-lg bg-gray-100">
            {animal.images.length > 0 ? (
              <Image
                src={animal.images[activeImage].url}
                alt={animal.images[activeImage].alt}
                fill
                className="object-fit"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No images available
              </div>
            )}
          </div>
          
          {animal.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {animal.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setActiveImage(index)}
                  className={`relative h-20 rounded-md overflow-hidden transition-all ${activeImage === index ? 'ring-2 ring-green-500' : 'opacity-80 hover:opacity-100'}`}
                >
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          
          {/* Videos Section */}
          {animal.videos.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                <span className="text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </span>
                Videos
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {animal.videos.map(video => (
                  <div key={video.id} className="relative aspect-video bg-black rounded-md overflow-hidden">
                    <video
                      src={video.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {animal.specie} - {animal.breed}
            </h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-green-600 text-white px-3 py-1 text-sm font-medium">
                PKR {animal.totalPrice.toLocaleString()}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {animal.gender}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {animal.quantity} Available
              </Badge>
              {animal.healthCertificate && (
                <Badge variant="outline" className="text-sm flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  Health Certified
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-lg mb-3">Quick Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <MapPin className="text-green-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="font-medium">{animal.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <Scale className="text-green-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Weight</p>
                    <p className="font-medium">{animal.weightValue} {animal.weightType}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <Calendar className="text-green-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Age</p>
                    <p className="font-medium">{animal.ageNumber} {animal.ageType}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <Clock className="text-green-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Listed</p>
                    <p className="font-medium">
                      {new Date(animal.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-lg mb-3">Seller Information</h3>
              <div className="flex items-center gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                  <User className="text-green-600 w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium">{animal.user.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {animal.user.email}
                  </p>
                </div>
              </div>
            </div>

            {animal.referredBy && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-lg mb-3">Mobile No.</h3>
                <p className="text-gray-700 dark:text-gray-300">{animal.referredBy}</p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-lg mb-3">Pricing Details</h3>
              <div className="space-y-2">
                {/* <div className="flex justify-between">
                  <span className="text-white">Purchase Price:</span>
                  <span className="font-medium">PKR {animal.purchasePrice.toLocaleString()}</span>
                </div> */}
                <div className="flex justify-between">
                  <span className="dark:text-white text-black">Selling Price:</span>
                  <span className="font-medium text-green-600">PKR {animal.totalPrice.toLocaleString()}</span>
                </div>
                {/* {animal.quantity > 1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per animal:</span>
                    <span className="font-medium">
                      PKR {(animal.totalPrice / animal.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )} */}
              </div>
            </div>
          </div>

          <div className="flex flex-col hover:cursor-pointer sm:flex-row gap-3 pt-4">
            <AddAnimalToCartButton animalId={animal.id} />
            
          </div>
        </div>
      </div>
    </div>
  )
}