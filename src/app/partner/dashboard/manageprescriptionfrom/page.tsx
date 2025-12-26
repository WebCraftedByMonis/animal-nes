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
  Syringe,
  Printer,
  User,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface PrescriptionItem {
  id?: number
  medicineName: string
  strength?: string | null
  dosage: string
  duration: string
  notes?: string | null
}

interface PrescriptionForm {
  id: number
  historyFormId: number
  doctorName: string
  qualification?: string | null
  clinicName?: string | null
  clinicAddress?: string | null
  clinicPhone?: string | null
  clinicEmail?: string | null
  ownerName: string
  ownerContact: string
  animalSpecies: string
  breed: string
  age: string
  sex: string
  clinicalDiagnosis?: string | null
  labDiagnosis?: string | null
  continuePrevMedicine?: boolean | null
  followUpDate?: string | null
  monitorSideEffects?: boolean | null
  maintainHygiene?: boolean | null
  prescriptionItems: PrescriptionItem[]
  createdAt: string
  updatedAt: string
  historyForm?: any
}

interface Partner {
  id: number
  partnerName: string
  partnerEmail: string
}

export default function PartnerPrescriptionsDashboard() {
  const router = useRouter()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [prescriptions, setPrescriptions] = useState<PrescriptionForm[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)

  const [selected, setSelected] = useState<PrescriptionForm | null>(null)
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

  const fetchPrescriptions = useCallback(async () => {
    if (!partner) return

    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/prescriptions', {
        params: {
          search,
          sortBy: 'id',
          sortOrder: 'desc',
          limit: 'all',
        },
      })

      // Filter prescriptions by the logged-in partner's name
      const filtered = (data.data ?? []).filter(
        (p: PrescriptionForm) => p.doctorName === partner.partnerName
      )
      setPrescriptions(filtered)
    } catch (error) {
      console.error(error)
      toast.error('Failed to fetch prescriptions')
    } finally {
      setIsLoading(false)
    }
  }, [partner, search])

  useEffect(() => {
    if (partner) {
      fetchPrescriptions()
    }
  }, [partner, fetchPrescriptions])

  const handleView = (p: PrescriptionForm) => {
    setSelected(p)
    setViewDialogOpen(true)
  }

  const handlePrint = (p: PrescriptionForm) => {
    const printContent = `
      <html>
        <head>
          <title>Prescription - ${p.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Veterinary Prescription</h1>
            <p><strong>${p.clinicName || 'Clinic'}</strong></p>
            <p>${p.clinicAddress || ''}</p>
            <p>Phone: ${p.clinicPhone || ''} | Email: ${p.clinicEmail || ''}</p>
          </div>

          <div class="section">
            <h3>Doctor Information</h3>
            <p><span class="label">Doctor:</span> ${p.doctorName}</p>
            <p><span class="label">Qualification:</span> ${p.qualification || 'N/A'}</p>
            <p><span class="label">Date:</span> ${format(new Date(p.createdAt), 'PPP')}</p>
          </div>

          <div class="section">
            <h3>Patient Information</h3>
            <p><span class="label">Owner:</span> ${p.ownerName}</p>
            <p><span class="label">Contact:</span> ${p.ownerContact}</p>
            <p><span class="label">Animal:</span> ${p.animalSpecies} - ${p.breed}</p>
            <p><span class="label">Age:</span> ${p.age} | <span class="label">Sex:</span> ${p.sex}</p>
          </div>

          <div class="section">
            <h3>Diagnosis</h3>
            <p><span class="label">Clinical:</span> ${p.clinicalDiagnosis || 'N/A'}</p>
            <p><span class="label">Lab:</span> ${p.labDiagnosis || 'N/A'}</p>
          </div>

          <div class="section">
            <h3>Prescription</h3>
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Strength</th>
                  <th>Dosage</th>
                  <th>Duration</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${p.prescriptionItems
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.medicineName}</td>
                    <td>${item.strength || '-'}</td>
                    <td>${item.dosage}</td>
                    <td>${item.duration}</td>
                    <td>${item.notes || '-'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>Instructions</h3>
            <ul>
              ${p.continuePrevMedicine ? '<li>Continue previous medicines as advised</li>' : ''}
              ${p.monitorSideEffects ? '<li>Monitor for side effects</li>' : ''}
              ${p.maintainHygiene ? '<li>Maintain hygiene and biosecurity</li>' : ''}
              ${p.followUpDate ? `<li>Follow-up date: ${format(new Date(p.followUpDate), 'PPP')}</li>` : ''}
            </ul>
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
  const filteredPrescriptions = prescriptions.filter(
    (p) =>
      p.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      p.animalSpecies.toLowerCase().includes(search.toLowerCase()) ||
      p.breed.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-3xl font-bold text-green-600">My Prescriptions</h1>
          </div>
          <p className="text-gray-600 mt-1">View and manage your prescription records</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by owner, species, or breed..."
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
                <p className="text-sm text-gray-600">Total Prescriptions</p>
                <p className="text-2xl font-bold">{prescriptions.length}</p>
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
                  {new Set(prescriptions.map((p) => p.ownerName)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Syringe className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">
                  {
                    prescriptions.filter((p) => {
                      const date = new Date(p.createdAt)
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

      {/* Prescriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No prescriptions found</p>
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
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrescriptions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>#{p.id}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(p.createdAt), 'PP')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.ownerName}</div>
                        <div className="text-xs text-gray-500">{p.ownerContact}</div>
                      </TableCell>
                      <TableCell>
                        <div>{p.animalSpecies}</div>
                        <div className="text-xs text-gray-500">
                          {p.breed} • {p.age} • {p.sex}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{p.clinicalDiagnosis || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.prescriptionItems.length} items</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleView(p)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handlePrint(p)}>
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
            <DialogTitle>Prescription Details - #{selected?.id}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              {/* Doctor Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Doctor Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selected.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Qualification</p>
                    <p className="font-medium">{selected.qualification || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Clinic</p>
                    <p className="font-medium">{selected.clinicName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selected.clinicPhone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Patient Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Owner</p>
                    <p className="font-medium">{selected.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Contact</p>
                    <p className="font-medium">{selected.ownerContact}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Species</p>
                    <p className="font-medium">{selected.animalSpecies}</p>
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
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <h3 className="font-semibold mb-3">Diagnosis</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Clinical Diagnosis</p>
                    <p className="font-medium">{selected.clinicalDiagnosis || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lab Diagnosis</p>
                    <p className="font-medium">{selected.labDiagnosis || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Prescription Items */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Syringe className="h-5 w-5" />
                  Prescription Items
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Strength</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.prescriptionItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell>{item.strength || '-'}</TableCell>
                        <TableCell>{item.dosage}</TableCell>
                        <TableCell>{item.duration}</TableCell>
                        <TableCell>{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-semibold mb-3">Instructions</h3>
                <div className="space-y-2">
                  {selected.continuePrevMedicine && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Continue previous medicines</Badge>
                    </div>
                  )}
                  {selected.monitorSideEffects && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Monitor side effects</Badge>
                    </div>
                  )}
                  {selected.maintainHygiene && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Maintain hygiene</Badge>
                    </div>
                  )}
                  {selected.followUpDate && (
                    <div>
                      <p className="text-sm text-gray-600">Follow-up Date</p>
                      <p className="font-medium">
                        {format(new Date(selected.followUpDate), 'PPP')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

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
