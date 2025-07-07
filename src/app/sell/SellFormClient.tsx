'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'react-hot-toast'

export default function SellFormClient() {
  const [loading, setLoading] = useState(false)

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

          <div><Label>Total Price</Label><Input name="totalPrice" type="number" step="0.01" required /></div>
          <div><Label>Purchase Price</Label><Input name="purchasePrice" type="number" step="0.01" required /></div>

          <div className="col-span-full">
            <Label>Referred By (optional)</Label>
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
