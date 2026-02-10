'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Cake, User, Phone, MapPin, Calendar } from 'lucide-react'
import Image from 'next/image'
import { formatDate } from 'date-fns'
import WhatsAppLink from '@/components/WhatsAppLink'

interface BirthdayPartner {
  id: number
  partnerName: string
  partnerMobileNumber?: string
  cityName?: string
  areaTown?: string // This is the birthday field
  partnerType?: string
  partnerImage?: {
    url: string
    publicId: string
  }
}

interface BirthdayModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BirthdayModal({ isOpen, onClose }: BirthdayModalProps) {
  const [birthdayPartners, setBirthdayPartners] = useState<BirthdayPartner[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBirthdayPartners = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data } = await axios.get('/api/partner/birthdays')
      setBirthdayPartners(data.partners || [])
    } catch (error) {
      console.error('Failed to fetch birthday partners:', error)
      setError('Failed to load birthday partners')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchBirthdayPartners()
    }
  }, [isOpen])

  const formatBirthday = (birthday: string | undefined) => {
    if (!birthday) return 'Unknown'

    try {
      // Try to parse various date formats
      let date: Date

      // Check if it's in YYYY-MM-DD format
      if (birthday.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(birthday)
      }
      // Check if it's in DD/MM/YYYY or MM/DD/YYYY format
      else if (birthday.includes('/')) {
        date = new Date(birthday)
      }
      // Try parsing as-is
      else {
        date = new Date(birthday)
      }

      if (isNaN(date.getTime())) {
        return birthday // Return original if can't parse
      }

      return formatDate(date, 'MMM dd, yyyy')
    } catch {
      return birthday // Return original if can't parse
    }
  }

  const getCurrentAge = (birthday: string | undefined) => {
    if (!birthday) return null

    try {
      const birthDate = new Date(birthday)
      if (isNaN(birthDate.getTime())) return null

      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1
      }

      return age
    } catch {
      return null
    }
  }

  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCardUrl = (partner: BirthdayPartner) => {
    const params = new URLSearchParams()
    params.set('name', partner.partnerName)
    if (partner.partnerImage?.url) {
      params.set('image', partner.partnerImage.url)
    }
    return `/api/birthday-card?${params.toString()}`
  }

  const getDownloadUrl = (partner: BirthdayPartner) => {
    const params = new URLSearchParams()
    params.set('name', partner.partnerName)
    if (partner.partnerImage?.url) {
      params.set('image', partner.partnerImage.url)
    }
    params.set('download', '1')
    return `/api/birthday-card?${params.toString()}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Cake className="w-6 h-6 text-pink-500" />
            Today's Birthday Partners
            <Badge variant="outline" className="ml-2">
              {getTodayDate()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading birthday partners...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-2">⚠️ Error</div>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
              <Button
                onClick={fetchBirthdayPartners}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : birthdayPartners.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎂</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No Birthdays Today
              </h3>
              <p className="text-gray-500">
                No partners have birthdays today. Check back tomorrow!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-green-600">
                  🎉 {birthdayPartners.length} Partner{birthdayPartners.length > 1 ? 's' : ''} Celebrating Today! 🎉
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {birthdayPartners.map((partner) => (
                  <div
                    key={partner.id}
                    className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Partner Image */}
                      <div className="flex-shrink-0">
                        {partner.partnerImage?.url ? (
                          <div className="relative">
                            <Image
                              src={partner.partnerImage.url}
                              alt={`${partner.partnerName} image`}
                              width={70}
                              height={70}
                              className="rounded-full object-cover border-2 border-pink-200"
                            />
                            <div className="absolute -top-2 -right-2 bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
                              🎂
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="w-[70px] h-[70px] bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-700 dark:to-purple-700 rounded-full flex items-center justify-center border-2 border-pink-200">
                              <User className="w-9 h-9 text-pink-600 dark:text-pink-300" />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
                              🎂
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Partner Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 break-words">
                              {partner.partnerName}
                            </h4>
                            {partner.partnerType && (
                              <Badge variant="secondary" className="mt-1">
                                {partner.partnerType}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-3xl">🎈</div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span className="break-words">Birthday: {formatBirthday(partner.areaTown)}</span>
                            {getCurrentAge(partner.areaTown) && (
                              <Badge variant="outline" className="ml-auto">
                                {getCurrentAge(partner.areaTown)} years old
                              </Badge>
                            )}
                          </div>

                          {partner.partnerMobileNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <WhatsAppLink phone={partner.partnerMobileNumber} showIcon={false} className="break-all" />
                            </div>
                          )}

                          {partner.cityName && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="break-words">{partner.cityName}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          {partner.partnerMobileNumber && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`tel:${partner.partnerMobileNumber}`, '_self')}
                              className="text-sm whitespace-nowrap"
                            >
                              📞 Call
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const cardUrl = getCardUrl(partner)
                              const message = `Happy Birthday ${partner.partnerName}! Here's your birthday card: ${cardUrl}`
                              if (partner.partnerMobileNumber) {
                                window.open(`https://wa.me/${partner.partnerMobileNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
                              }
                            }}
                            className="text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 flex-1 sm:flex-initial"
                            disabled={!partner.partnerMobileNumber}
                          >
                            🎉 Send Card on WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const cardUrl = getCardUrl(partner)
                              window.open(cardUrl, '_blank')
                            }}
                            className="text-sm"
                          >
                            View Card
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const downloadUrl = getDownloadUrl(partner)
                              window.open(downloadUrl, '_blank')
                            }}
                            className="text-sm"
                          >
                            Download Card
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
