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
import { useCountry } from '@/contexts/CountryContext'

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

const SECTION_SIZE = 10

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export default function StickyLogoPage() {
  const { country } = useCountry()
  const [stickyLogos, setStickyLogos] = useState<StickyLogo[]>([])
  const [companyId, setCompanyId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [companyPreview, setCompanyPreview] = useState<Company | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const fetchStickyLogos = async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/sticky-logo', {
        params: { country },
      })
      setStickyLogos(data.data || [])
    } catch (error) {
      console.log(error)
      toast.error('Failed to fetch sticky logos')
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
      const { data } = await axios.get(`/api/company/${id}`, {
        params: { country },
      })
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
    fetchStickyLogos()
  }, [country])

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
      await axios.post('/api/sticky-logo', {
        companyId: Number(companyId),
        country,
      })
      await fetchStickyLogos()
      setCompanyId('')
      setCompanyPreview(null)
      toast.success('Sticky logo added successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add sticky logo')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async (id: number) => {
    setRemovingId(id)
    try {
      await axios.delete(`/api/sticky-logo?id=${id}`)
      await fetchStickyLogos()
      toast.success('Sticky logo removed successfully')
    } catch (error) {
      toast.error('Failed to remove sticky logo')
    } finally {
      setRemovingId(null)
    }
  }

  const handleRemoveAll = async () => {
    if (!confirm('Are you sure you want to remove all sticky logos?')) {
      return
    }

    setRemovingId(-1)
    try {
      await axios.delete('/api/sticky-logo', {
        params: { country },
      })
      await fetchStickyLogos()
      toast.success('All sticky logos removed successfully')
    } catch (error) {
      toast.error('Failed to remove sticky logos')
    } finally {
      setRemovingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  const sections = chunkArray(stickyLogos, SECTION_SIZE)
  const totalSections = sections.length
  const currentSectionFill = stickyLogos.length % SECTION_SIZE || (stickyLogos.length > 0 ? SECTION_SIZE : 0)

  return (
    <div className="p-6 space-y-6 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-green-500">
          Sticky Logo Management
        </h1>
        <div className="text-sm text-muted-foreground">
          {stickyLogos.length} logo{stickyLogos.length !== 1 ? 's' : ''} across {totalSections || 0} section{totalSections !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Section-grouped logo list */}
      {sections.length > 0 ? (
        sections.map((sectionLogos, sectionIndex) => (
          <Card key={sectionIndex}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Section {sectionIndex + 1}
                    {sectionIndex === 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">(first column — max {SECTION_SIZE})</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {sectionLogos.length} / {sectionIndex === sections.length - 1 && sectionLogos.length < SECTION_SIZE ? `${SECTION_SIZE} slots` : `${SECTION_SIZE}`} logos
                    {sectionIndex < sections.length - 1 && ' (full — next section started)'}
                  </CardDescription>
                </div>
                {sectionIndex === 0 && stickyLogos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAll}
                    disabled={removingId === -1}
                    className="text-red-600 hover:text-red-700 border-red-200"
                  >
                    {removingId === -1 ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Remove All'
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sectionLogos.map((logo) => (
                  <div key={logo.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    {logo.company.image && (
                      <Image
                        src={logo.company.image.url}
                        alt={logo.company.image.alt}
                        width={60}
                        height={60}
                        className="rounded object-contain"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {logo.company.companyName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Company ID: {logo.companyId}
                      </p>
                      <Link
                        href={`/Companies/${logo.companyId}`}
                        className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mt-1"
                        target="_blank"
                      >
                        View company page <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(logo.id)}
                      disabled={removingId === logo.id}
                    >
                      {removingId === logo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No sticky logos configured yet.
          </CardContent>
        </Card>
      )}

      {/* Add new logo */}
      <Card>
        <CardHeader>
          <CardTitle>Add Sticky Logo</CardTitle>
          <CardDescription>
            Enter a company ID to add a new sticky logo.
            {stickyLogos.length > 0 && currentSectionFill < SECTION_SIZE
              ? ` Adding to Section ${totalSections} (${currentSectionFill}/${SECTION_SIZE} used).`
              : stickyLogos.length > 0
              ? ` Section ${totalSections} is full — a new section will be created.`
              : ' Section 1 will hold the first 10 logos.'}
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
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Logo
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
            How sections work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Logos are grouped into sections of {SECTION_SIZE}.</li>
            <li>Section 1 (first column, rightmost on screen) holds the first {SECTION_SIZE} logos.</li>
            <li>Once Section 1 is full, new logos automatically start Section 2 (next column to the left).</li>
            <li>Each section appears as a separate column of logos on the site.</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            To find a company ID: go to View Companies and check the ID column, or look at the URL on a company page.
          </p>
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
