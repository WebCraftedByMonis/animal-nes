// components/FullScreenSlider.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

const images = [
  "/1.jpg",
  "/2.jpg",
  "/3.jpg",
  "/4.jpg",
  "/5.jpg",
  "/6.jpg",
"/g.png",
"/hhh.webp",
"/cow.png"
  // Add your actual image paths here
]

export default function FullShcreenSlider() {
  const [current, setCurrent] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const delay = 5000 // milliseconds

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % images.length)
  }

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length)
  }

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      nextSlide()
    }, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [current])

  return (
    <div className="relative h-[50vh] lg:w-screen lg:h-screen overflow-hidden group">
      {images.map((src, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <Image
            src={src}
            alt={`Slide ${index}`}
            layout="fill"
            objectFit="cover"
            className="transition-all duration-1000"
            priority={index === 0}
          />
          

          
        </div>



      ))}

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/70 transition z-20 hidden group-hover:block"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/70 transition z-20 hidden group-hover:block"
      >
        <ChevronRight size={24} />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 w-full flex justify-center gap-2 z-20">
        {images.map((_, idx) => (
          <button
            key={idx}
            className={`w-3 h-3 rounded-full ${
              idx === current ? "bg-white" : "bg-white/40"
            }`}
            onClick={() => setCurrent(idx)}
          />
        ))}
      </div>
    </div>
  )
}
