'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'react-hot-toast'
import { useLoginModal } from '@/contexts/LoginModalContext'

export default function SellFormClient() {
  const [loading, setLoading] = useState(false)
  const [hasPromptedLogin, setHasPromptedLogin] = useState(false)
  const { data: session, status } = useSession()
  const { openModal } = useLoginModal()

  useEffect(() => {
    if (status === 'unauthenticated' && !hasPromptedLogin) {
      setHasPromptedLogin(true)
      openModal('button')
    }
  }, [status, openModal, hasPromptedLogin])

  if (status === 'loading') {
    return (
      <div className="text-center mt-20 text-lg font-medium text-gray-600">
        Loading...
      </div>
    )
  }

  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-8 border border-green-200 dark:border-green-800">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-7V6a3 3 0 00-3-3H7a3 3 0 00-3 3v1M5 10h14M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Sell Your Animals
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Join thousands of sellers on our platform. Sign in to list your animals and reach potential buyers.
          </p>
          <button
            onClick={() => openModal('button')}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Sign In to Start Selling
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    const res = await fetch('/api/sell-animal', {
      method: 'POST',
      body: formData,
    })

    setLoading(false)

    if (res.ok) {
      toast.success('Animal submitted!')
      form.reset()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Submission failed')
    }
  }

  return (
    <Card className="max-w-3xl mx-auto mt-10 shadow-xl border-green-500">
      <CardContent className="p-8 space-y-8">
        <h1 className="text-2xl font-semibold text-center text-green-600">Sell Animal</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          <div><Label>Specie</Label><Input name="specie" required /></div>

          <div><Label>Breed</Label><Input name="breed" required /></div>
          <div><Label>Location</Label><Input name="location" required /></div>

          <div><Label>Quantity</Label><Input name="quantity" type="number" required /></div>
          <div><Label>Age</Label><Input name="ageNumber" type="number" required /></div>

          <div>
            <Label>Age Type</Label>
            <Select name="ageType" required>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DAYS">Days</SelectItem>
                <SelectItem value="WEEKS">Weeks</SelectItem>
                <SelectItem value="MONTHS">Months</SelectItem>
                <SelectItem value="YEARS">Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div><Label>Weight</Label><Input name="weightValue" type="number" step="0.01" required /></div>

          <div>
            <Label>Weight Type</Label>
            <Select name="weightType" required>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GRAMS">Grams</SelectItem>
                <SelectItem value="KGS">Kgs</SelectItem>
                <SelectItem value="MUNS">Muns</SelectItem>
                <SelectItem value="TONS">Tons</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Gender</Label>
            <Select name="gender" required>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

       

          <div>
            <Label>Health Certificate</Label>
            <Select name="healthCertificate" required>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Available</SelectItem>
                <SelectItem value="false">Not Available</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div><Label>Asking Price</Label><Input name="totalPrice" type="number" step="0.01" required /></div>
          <div><Label>Final Price</Label><Input name="purchasePrice" type="number" step="0.01" required /></div>

          <div className="col-span-full">
            <Label>Mobile No. (optional)</Label>
            <Input name="referredBy" type="text" />
          </div>

          <div className="col-span-full">
            <Label>Image (Required)</Label>
            <Input name="image" type="file" accept="image/*" required />
          </div>

          <div className="col-span-full">
            <Label>Video (Optional)</Label>
            <Input name="video" type="file" accept="video/*" />
          </div>

          <div className="col-span-full">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
