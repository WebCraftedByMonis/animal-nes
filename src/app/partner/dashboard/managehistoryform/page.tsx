'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Loader2,
  Eye,
  FileText,
  User,
  Heart,
  Syringe,
  AlertCircle,
  Home,
  Activity,
  Printer,
  ArrowLeft,
  ClipboardList,
} from 'lucide-react'
import Link from 'next/link'

interface HistoryForm {
  id: number
  name: string
  contact: string
  address: string
  animalSpecie: string
  breed: string
  age: string
  sex: string
  tag: string | null
  use: string | null
  mainIssue: string
  duration: string
  pastIllness: string | null
  pastTreatment: string | null
  allergies: string | null
  surgeries: string | null
  reproductiveStatus: string | null
  lastEvent: string | null
  diet: string | null
  water: string | null
  housing: string | null
  milkPerDay: string | null
  eggPerDay: string | null
  weightGain: string | null
  vaccinationDeworming: boolean | null
  lastGiven: string | null
  nextDue: string | null
  newAnimalContact: boolean | null
  transport: boolean | null
  outbreakNearby: boolean | null
  wildlife: boolean | null
  parasites: boolean | null
  examinedBy: string | null
  examinationDate: string | null
  referalNo: string | null
  createdAt: string
  updatedAt: string
  appointment?: {
    assignedDoctor: {
      partnerName: string
    }
  }
}

interface Partner {
  id: number
  partnerName: string
  partnerEmail: string
}

export default function PartnerHistoryFormsPage() {
  const router = useRouter()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [historyForms, setHistoryForms] = useState<HistoryForm[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)

  const [selected, setSelected] = useState<HistoryForm | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  // Check partner authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/partner/check-auth')
        const data = await response.json()

        if (response.ok && data.authenticated) {
          setPartner(data.partner)
        } else {
          router.push('/partner/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/partner/login')
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchHistoryForms = useCallback(async () => {
    if (!partner) return

    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/history-forms', {
        params: {
          search,
          sortBy: 'id',
          sortOrder: 'desc',
          limit: 'all',
        },
      })

      // Filter by partner's name - check examinedBy field or appointment assignedDoctor
      const filtered = (data.data ?? []).filter((form: HistoryForm) => {
        // Check if the form was examined by this partner
        if (form.examinedBy === partner.partnerName) {
          return true
        }
        // Also check if the appointment was assigned to this partner
        if (form.appointment?.assignedDoctor?.partnerName === partner.partnerName) {
          return true
        }
        return false
      })

      setHistoryForms(filtered)
    } catch (error) {
      console.error(error)
      toast.error('Failed to fetch history forms')
    } finally {
      setIsLoading(false)
    }
  }, [partner, search])

  useEffect(() => {
    if (partner) {
      fetchHistoryForms()
    }
  }, [partner, fetchHistoryForms])

  const handleView = (form: HistoryForm) => {
    setSelected(form)
    setViewDialogOpen(true)
  }

  const handlePrint = (form: HistoryForm) => {
    const printContent = `
      <html>
        <head>
          <title>History Form - ${form.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .section { margin: 20px 0; page-break-inside: avoid; }
            .section h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .label { font-weight: bold; display: inline-block; width: 180px; }
            .value { display: inline-block; }
            .risk-factors { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Animal History Form</h1>
            <p>Reference No: ${form.id}</p>
            <p>Date: ${format(new Date(form.createdAt), 'PPP')}</p>
          </div>

          <div class="section">
            <h3>Owner / Farm Information</h3>
            <p><span class="label">Name:</span> <span class="value">${form.name}</span></p>
            <p><span class="label">Contact:</span> <span class="value">${form.contact}</span></p>
            <p><span class="label">Address:</span> <span class="value">${form.address}</span></p>
          </div>

          <div class="section">
            <h3>Animal Identification</h3>
            <p><span class="label">Species:</span> <span class="value">${form.animalSpecie}</span></p>
            <p><span class="label">Breed:</span> <span class="value">${form.breed}</span></p>
            <p><span class="label">Age:</span> <span class="value">${form.age}</span></p>
            <p><span class="label">Sex:</span> <span class="value">${form.sex}</span></p>
            ${form.tag ? `<p><span class="label">Tag/Microchip:</span> <span class="value">${form.tag}</span></p>` : ''}
            ${form.use ? `<p><span class="label">Purpose:</span> <span class="value">${form.use}</span></p>` : ''}
          </div>

          <div class="section">
            <h3>Presenting Complaint</h3>
            <p><span class="label">Main Issue:</span> <span class="value">${form.mainIssue}</span></p>
            <p><span class="label">Duration:</span> <span class="value">${form.duration}</span></p>
          </div>

          <div class="section">
            <h3>Medical History</h3>
            ${form.pastIllness ? `<p><span class="label">Past Illness:</span> <span class="value">${form.pastIllness}</span></p>` : ''}
            ${form.pastTreatment ? `<p><span class="label">Past Treatment:</span> <span class="value">${form.pastTreatment}</span></p>` : ''}
            ${form.allergies ? `<p><span class="label">Allergies:</span> <span class="value">${form.allergies}</span></p>` : ''}
            ${form.surgeries ? `<p><span class="label">Surgeries:</span> <span class="value">${form.surgeries}</span></p>` : ''}
          </div>

          ${form.reproductiveStatus || form.lastEvent ? `
          <div class="section">
            <h3>Reproductive Information</h3>
            ${form.reproductiveStatus ? `<p><span class="label">Status:</span> <span class="value">${form.reproductiveStatus}</span></p>` : ''}
            ${form.lastEvent ? `<p><span class="label">Last Event:</span> <span class="value">${form.lastEvent}</span></p>` : ''}
          </div>
          ` : ''}

          <div class="section">
            <h3>Management & Nutrition</h3>
            ${form.diet ? `<p><span class="label">Diet:</span> <span class="value">${form.diet}</span></p>` : ''}
            ${form.water ? `<p><span class="label">Water Source:</span> <span class="value">${form.water}</span></p>` : ''}
            ${form.housing ? `<p><span class="label">Housing:</span> <span class="value">${form.housing}</span></p>` : ''}
          </div>

          ${form.milkPerDay || form.eggPerDay || form.weightGain ? `
          <div class="section">
            <h3>Production Records</h3>
            ${form.milkPerDay ? `<p><span class="label">Milk/Day:</span> <span class="value">${form.milkPerDay} liters</span></p>` : ''}
            ${form.eggPerDay ? `<p><span class="label">Eggs/Day:</span> <span class="value">${form.eggPerDay}</span></p>` : ''}
            ${form.weightGain ? `<p><span class="label">Weight Gain:</span> <span class="value">${form.weightGain}</span></p>` : ''}
          </div>
          ` : ''}

          <div class="section">
            <h3>Vaccination / Deworming</h3>
            <p><span class="label">Status:</span> <span class="value">${form.vaccinationDeworming ? 'Done' : 'Not Done'}</span></p>
            ${form.lastGiven ? `<p><span class="label">Last Given:</span> <span class="value">${form.lastGiven}</span></p>` : ''}
            ${form.nextDue ? `<p><span class="label">Next Due:</span> <span class="value">${form.nextDue}</span></p>` : ''}
          </div>

          <div class="section">
            <h3>Risk Factors</h3>
            <div class="risk-factors">
              <p>New Animal Contact: ${form.newAnimalContact ? 'Yes' : 'No'}</p>
              <p>Transport: ${form.transport ? 'Yes' : 'No'}</p>
              <p>Outbreak Nearby: ${form.outbreakNearby ? 'Yes' : 'No'}</p>
              <p>Wildlife: ${form.wildlife ? 'Yes' : 'No'}</p>
              <p>Parasites: ${form.parasites ? 'Yes' : 'No'}</p>
            </div>
          </div>

          <div class="section">
            <h3>Examination Details</h3>
            ${form.examinedBy ? `<p><span class="label">Examined By:</span> <span class="value">${form.examinedBy}</span></p>` : ''}
            ${form.examinationDate ? `<p><span class="label">Examination Date:</span> <span class="value">${format(new Date(form.examinationDate), 'PPP')}</span></p>` : ''}
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Filter by search
  const filteredForms = historyForms.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.animalSpecie.toLowerCase().includes(search.toLowerCase()) ||
      f.breed.toLowerCase().includes(search.toLowerCase()) ||
      f.mainIssue.toLowerCase().includes(search.toLowerCase())
  )

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    )
  }

  if (!partner) {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/partner/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-green-600">My History Forms</h1>
          </div>
          <p className="text-gray-600 mt-1">View and manage patient history forms</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search History Forms</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by owner, species, breed, or issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Forms</p>
                <p className="text-2xl font-bold">{historyForms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unique Patients</p>
                <p className="text-2xl font-bold">
                  {new Set(historyForms.map((f) => f.name)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">
                  {
                    historyForms.filter((f) => {
                      const date = new Date(f.createdAt)
                      const now = new Date()
                      return (
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear()
                      )
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Forms Table */}
      <Card>
        <CardHeader>
          <CardTitle>History Form Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No history forms found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Animal</TableHead>
                    <TableHead>Main Issue</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell>#{form.id}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(form.createdAt), 'PP')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{form.name}</div>
                        <div className="text-xs text-gray-500">{form.contact}</div>
                      </TableCell>
                      <TableCell>
                        <div>{form.animalSpecie}</div>
                        <div className="text-xs text-gray-500">
                          {form.breed} • {form.age} • {form.sex}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{form.mainIssue}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{form.duration}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleView(form)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handlePrint(form)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>History Form Details - #{selected?.id}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              {/* Owner Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Owner / Farm Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selected.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Contact</p>
                    <p className="font-medium">{selected.contact}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{selected.address}</p>
                  </div>
                </div>
              </div>

              {/* Animal Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Animal Identification
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Species</p>
                    <p className="font-medium">{selected.animalSpecie}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Breed</p>
                    <p className="font-medium">{selected.breed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Age</p>
                    <p className="font-medium">{selected.age}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sex</p>
                    <p className="font-medium">{selected.sex}</p>
                  </div>
                  {selected.tag && (
                    <div>
                      <p className="text-sm text-gray-600">Tag/Microchip</p>
                      <p className="font-medium">{selected.tag}</p>
                    </div>
                  )}
                  {selected.use && (
                    <div>
                      <p className="text-sm text-gray-600">Purpose/Use</p>
                      <p className="font-medium">{selected.use}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Presenting Complaint */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Presenting Complaint
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Main Issue</p>
                    <p className="font-medium">{selected.mainIssue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium">{selected.duration}</p>
                  </div>
                </div>
              </div>

              {/* Medical History */}
              {(selected.pastIllness || selected.pastTreatment || selected.allergies || selected.surgeries) && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Medical History
                  </h3>
                  <div className="space-y-2">
                    {selected.pastIllness && (
                      <div>
                        <p className="text-sm text-gray-600">Past Illness</p>
                        <p className="font-medium">{selected.pastIllness}</p>
                      </div>
                    )}
                    {selected.pastTreatment && (
                      <div>
                        <p className="text-sm text-gray-600">Past Treatment</p>
                        <p className="font-medium">{selected.pastTreatment}</p>
                      </div>
                    )}
                    {selected.allergies && (
                      <div>
                        <p className="text-sm text-gray-600">Allergies</p>
                        <p className="font-medium">{selected.allergies}</p>
                      </div>
                    )}
                    {selected.surgeries && (
                      <div>
                        <p className="text-sm text-gray-600">Surgeries</p>
                        <p className="font-medium">{selected.surgeries}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vaccination */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Syringe className="h-5 w-5" />
                  Vaccination / Deworming
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge variant={selected.vaccinationDeworming ? 'default' : 'secondary'}>
                      {selected.vaccinationDeworming ? 'Done' : 'Not Done'}
                    </Badge>
                  </div>
                  {selected.lastGiven && (
                    <div>
                      <p className="text-sm text-gray-600">Last Given</p>
                      <p className="font-medium">{selected.lastGiven}</p>
                    </div>
                  )}
                  {selected.nextDue && (
                    <div>
                      <p className="text-sm text-gray-600">Next Due</p>
                      <p className="font-medium">{selected.nextDue}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Factors */}
              <div>
                <h3 className="font-semibold mb-3">Risk Factors</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selected.newAnimalContact && <Badge variant="secondary">New Animal Contact</Badge>}
                  {selected.transport && <Badge variant="secondary">Transport</Badge>}
                  {selected.outbreakNearby && <Badge variant="secondary">Outbreak Nearby</Badge>}
                  {selected.wildlife && <Badge variant="secondary">Wildlife</Badge>}
                  {selected.parasites && <Badge variant="secondary">Parasites</Badge>}
                </div>
              </div>

              {/* Examination Details */}
              {(selected.examinedBy || selected.examinationDate) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Examination Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selected.examinedBy && (
                      <div>
                        <p className="text-sm text-gray-600">Examined By</p>
                        <p className="font-medium">{selected.examinedBy}</p>
                      </div>
                    )}
                    {selected.examinationDate && (
                      <div>
                        <p className="text-sm text-gray-600">Examination Date</p>
                        <p className="font-medium">
                          {format(new Date(selected.examinationDate), 'PPP')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Created: {format(new Date(selected.createdAt), 'PPP p')}
                </div>
                <Button onClick={() => handlePrint(selected)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
