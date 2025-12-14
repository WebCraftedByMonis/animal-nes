'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Image from 'next/image'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, X, ExternalLink } from 'lucide-react'

interface Company {
  id: number
  companyName: string
  mobileNumber: string | null
  address: string | null
  email: string | null
  image: { url: string; alt: string; publicId: string | null } | null
  products: { id: number }[]
}

interface StickyLogo {
  id: number
  companyId: number
  isActive: boolean
  company: Company
}

export default function StickyLogoPage() {
  const [stickyLogo, setStickyLogo] = useState<StickyLogo | null>(null)
  const [companyId, setCompanyId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [companyPreview, setCompanyPreview] = useState<Company | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const fetchStickyLogo = async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/sticky-logo')
      setStickyLogo(data.data)
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch sticky logo configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCompanyPreview = async (id: string) => {
    if (!id || isNaN(Number(id))) {
      setCompanyPreview(null)
      return
    }

    setIsLoadingPreview(true)
    try {
      const { data } = await axios.get(`/api/company/${id}`)
      setCompanyPreview(data)
    } catch (error) {
      console.log(error)
      setCompanyPreview(null)
      toast.error('Company not found')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  useEffect(() => {
    fetchStickyLogo()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (companyId) {
        fetchCompanyPreview(companyId)
      } else {
        setCompanyPreview(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [companyId])

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Please enter a company ID')
      return
    }

    setIsSaving(true)
    try {
      const { data } = await axios.post('/api/sticky-logo', {
        companyId: Number(companyId),
      })
      setStickyLogo(data.data)
      setCompanyId('')
      setCompanyPreview(null)
      toast.success('Sticky logo updated successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update sticky logo')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await axios.delete('/api/sticky-logo')
      setStickyLogo(null)
      toast.success('Sticky logo removed successfully')
    } catch (error) {
      toast.error('Failed to remove sticky logo')
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-green-500">
        Sticky Logo Management
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Current Sticky Logo</CardTitle>
          <CardDescription>
            The company logo displayed on the homepage that redirects to the company detail page
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stickyLogo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                {stickyLogo.company.image && (
                  <Image
                    src={stickyLogo.company.image.url}
                    alt={stickyLogo.company.image.alt}
                    width={80}
                    height={80}
                    className="rounded object-contain"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {stickyLogo.company.companyName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Company ID: {stickyLogo.companyId}
                  </p>
                  <Link
                    href={`/Companies/${stickyLogo.companyId}`}
                    className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mt-1"
                    target="_blank"
                  >
                    View company page <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No sticky logo configured
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Set Sticky Logo</CardTitle>
          <CardDescription>
            Enter a company ID to set or update the sticky logo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter Company ID"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSave}
              disabled={isSaving || !companyId || !companyPreview}
              className="bg-green-500 hover:bg-green-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Set Logo
                </>
              )}
            </Button>
          </div>

          {isLoadingPreview && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-green-500" />
            </div>
          )}

          {companyPreview && !isLoadingPreview && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Preview:</h4>
              <div className="flex items-center gap-4">
                {companyPreview.image && (
                  <Image
                    src={companyPreview.image.url}
                    alt={companyPreview.image.alt}
                    width={80}
                    height={80}
                    className="rounded object-contain"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{companyPreview.companyName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {companyPreview.products.length} products
                  </p>
                  {companyPreview.address && (
                    <p className="text-sm text-muted-foreground">
                      {companyPreview.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {companyId && !companyPreview && !isLoadingPreview && (
            <p className="text-sm text-red-500">
              Company not found with ID: {companyId}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
        <CardHeader>
          <CardTitle className="text-yellow-700 dark:text-yellow-500">
            How to find Company ID
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>You can find the company ID in several ways:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Go to the View Companies page in the dashboard</li>
            <li>The ID column shows the company ID for each company</li>
            <li>Or visit the company detail page and check the URL (Companies/[id])</li>
          </ul>
          <Link
            href="/dashboard/viewCompanies"
            className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium mt-2"
          >
            View Companies <ExternalLink className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
