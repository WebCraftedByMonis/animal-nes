'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, DollarSign, Users, Calendar } from 'lucide-react'

interface FormCardProps {
  form: {
    id: string
    title: string
    description: string | null
    slug: string
    thumbnailUrl: string | null
    thumbnailPublicId: string | null
    paymentRequired: boolean
    paymentAmount: number | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    _count: {
      fields: number
      submissions: number
    }
  }
}

export default function FormCard({ form }: FormCardProps) {
  return (
    <div className="group rounded-2xl overflow-hidden border border-green-200 bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      {/* Thumbnail Image */}
      <div className="relative w-full h-48 bg-gradient-to-br from-green-100 to-green-50 overflow-hidden">
        {form.thumbnailUrl ? (
          <Image
            src={form.thumbnailUrl}
            alt={form.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-20 h-20 text-green-300" />
          </div>
        )}

        {/* Payment Badge */}
        {form.paymentRequired && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
              <DollarSign className="w-3 h-3 mr-1" />
              Rs. {form.paymentAmount}
            </Badge>
          </div>
        )}

        {/* Active Badge */}
        {form.isActive && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-green-600 hover:bg-green-700 text-white">
              Active
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
          {form.title}
        </h3>

        {/* Description */}
        {form.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
            {form.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{form._count.fields} fields</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{form._count.submissions} submissions</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          asChild
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Link href={`/forms/${form.slug}`}>
            Open Form
          </Link>
        </Button>
      </div>
    </div>
  )
}
