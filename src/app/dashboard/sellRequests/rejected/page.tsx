'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface AnimalRequest {
  id: string
  title: string
  specie: string
  breed: string
  quantity: number
  ageNumber: number
  ageType: string
  weightValue: number
  weightType: string
  gender: string
  location: string
  wet: boolean
  healthCertificate: boolean
  totalPrice: number
  purchasePrice: number
  referredBy: string | null
  images: { url: string; alt: string }[]
  videos: { url: string; alt: string }[]
  status: string
}

export default function RejectedSellRequests() {
  const [requests, setRequests] = useState<AnimalRequest[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRejected = async () => {
      try {
        const res = await fetch('/api/sell-animal/rejected')
        const data = await res.json()
        setRequests(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchRejected()
  }, [])

  if (loading) return <div className="p-4 text-muted-foreground">Loading...</div>
  if (!requests?.length) return <div className="p-4 text-muted-foreground">No rejected requests.</div>

  return (
    <div className="grid gap-4 p-4">
      {requests.map((req) => (
        <Card key={req.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{req.title}</h2>
                <div className="text-sm text-muted-foreground">
                  {req.specie} - {req.breed} - {req.gender}
                </div>
                <div className="mt-1 text-sm">
                  Age: {req.ageNumber} {req.ageType.toLowerCase()} | Weight: {req.weightValue} {req.weightType.toLowerCase()} | Quantity: {req.quantity}
                </div>
                <div className="text-sm">Location: {req.location}</div>
                <div className="text-sm">Referred By: {req.referredBy || 'N/A'}</div>
                <div className="text-sm mt-1">
                  Wet: {req.wet ? 'Yes' : 'No'}, Health Certificate: {req.healthCertificate ? 'Yes' : 'No'}
                </div>
                <div className="text-sm mt-1">
                  Price: Rs. {req.totalPrice} | Purchase: Rs. {req.purchasePrice}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <img
                  src={req.images[0]?.url}
                  alt={req.images[0]?.alt}
                  className="h-24 w-24 rounded object-cover border"
                />
                {req.videos.length > 0 && (
                  <video
                    src={req.videos[0].url}
                    className="w-24 h-16 rounded border mt-1"
                    controls
                    muted
                  />
                )}
                <Badge variant="outline" className="mt-2">
                  {req.status}
                </Badge>
              </div>
            </div>
            <Separator className="mt-4" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
