'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog'
import WhatsAppLink from '@/components/WhatsAppLink'


interface UserProfile {
  name: string | null
  email: string | null
  image?: string | null
  phoneNumber?: string | null
  country?: string | null
}

interface Appointment {
  id: number
  doctor: string
  city: string
  species: string
  appointmentAt: string
  status: 'APPROVED' | 'REJECTED' | 'PENDING'
}

interface SellRequest {
  id: string
  specie: string
  breed: string
  ageNumber: number
  totalPrice: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  images: { url: string; alt?: string }[]
}



export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as UserProfile

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([])
  const [sellLoading, setSellLoading] = useState(true)


  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await fetch('/api/appointments/user')
        const data = await res.json()
        setAppointments(data.data)
      } catch (err) {
        console.error('Failed to fetch appointments', err)
      } finally {
        setLoading(false)
      }
    }
    const fetchSellRequests = async () => {
      try {
        const res = await fetch(`/api/sell-animal/user`)
        const data = await res.json()
        setSellRequests(data.items || [])
        // safe fallback
      } catch (err) {
        console.error('Failed to fetch sell requests', err)
        setSellRequests([]) 
      } finally {
        setSellLoading(false) 
      }
    }

    if (user?.email) {
      fetchAppointments()
      fetchSellRequests()
    }



  }, [user])

  const getInitials = (name: string = '') =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      {/* Profile Info Card */}
      <Card className="p-6 mb-6 border-none shadow-md bg-white dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
              <AvatarFallback className="bg-green-500 text-white text-2xl">
                {getInitials(user?.name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-green-500">{user?.name || 'Anonymous'}</h2>
              <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
              {user?.phoneNumber && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  📞 {user.phoneNumber}
                </p>
              )}
              {user?.country && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  🌍 {user.country}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button className="bg-green-500 hover:bg-green-600" onClick={() => router.push('/orders')}>
              Go to Order History
            </Button>
            <Button
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => router.push('/cart')}
            >
              View Cart
            </Button>
          </div>
        </div>
      </Card>

      {/* Appointments */}
      <h3 className="text-xl font-semibold text-green-600 mb-4">Recent Appointments</h3>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-gray-500 italic">No appointments found.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <Card key={appt.id} className="p-4 border bg-white dark:bg-zinc-900 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-green-700"><WhatsAppLink phone={appt.doctor || ''} showIcon={false} /></h4>
                    <p className="text-sm text-gray-500">
                      {appt.species} — {appt.city}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(appt.appointmentAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-white ${appt.status === 'APPROVED'
                      ? 'bg-green-500'
                      : appt.status === 'REJECTED'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                      }`}
                  >
                    {appt.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h3 className="text-xl font-semibold text-green-600 mt-10 mb-4">Your Sell Requests</h3>
      {sellLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : sellRequests && sellRequests.length === 0 ? (
        <p className="text-gray-500 italic">No sell requests found.</p>
      ) : (
        <div className="space-y-4">
          {sellRequests.map((r) => (
            <Card key={r.id} className="p-4 border bg-white dark:bg-zinc-900 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-green-700">{r.specie}</h4>
                    <p className="text-sm text-gray-500">
                      {r.breed} — {r.ageNumber} {r.ageNumber === 1 ? 'year' : 'years'} — pkr{r.totalPrice}
                    </p>

                  </div>
                 
                  <Badge
                    variant="outline"
                    className={`text-white ${r.status === 'ACCEPTED'
                        ? 'bg-green-500'
                        : r.status === 'REJECTED'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}
                  >
                    {r.status}
                  </Badge>
                  </div>
                  {r.images?.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <img
                          src={r.images[0].url}
                          alt={r.images[0].alt || 'animal'}
                          className="h-20 w-20 mt-4 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                        />
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogTitle className="sr-only">Zoomed Image</DialogTitle>
                        <img
                          src={r.images[0].url}
                          alt={r.images[0].alt || 'animal'}
                          className="w-full object-contain max-h-[80vh] rounded"
                        />
                      </DialogContent>
                    </Dialog>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}
