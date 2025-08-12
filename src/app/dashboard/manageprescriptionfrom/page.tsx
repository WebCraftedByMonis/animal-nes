'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
  Plus,
  Eye,
  FileText,
  Syringe,
  Printer,
  User,
  ClipboardList,
} from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export default function PrescriptionsDashboard() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionForm[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'doctorName' | 'ownerName'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState<number | 'all'>(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [selected, setSelected] = useState<PrescriptionForm | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<PrescriptionForm>>({})

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const fetchPrescriptions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: any = { search, sortBy, sortOrder, page }
      if (limit !== 'all') params.limit = limit
      else params.limit = 'all'

      const { data } = await axios.get('/api/prescriptions', { params })
      setPrescriptions(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      console.error(error)
      toast.error('Failed to fetch prescriptions')
    } finally {
      setIsLoading(false)
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  const toggleSort = (key: 'id' | 'doctorName' | 'ownerName') => {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const handleView = (p: PrescriptionForm) => {
    setSelected(p)
    setViewDialogOpen(true)
  }

  const handleEdit = (p: PrescriptionForm) => {
    // deep clone minimal
    setEditing({
      id: p.id,
      doctorName: p.doctorName,
      qualification: p.qualification,
      clinicName: p.clinicName,
      clinicAddress: p.clinicAddress,
      clinicPhone: p.clinicPhone,
      clinicEmail: p.clinicEmail,
      clinicalDiagnosis: p.clinicalDiagnosis,
      labDiagnosis: p.labDiagnosis,
      continuePrevMedicine: !!p.continuePrevMedicine,
      followUpDate: p.followUpDate ? p.followUpDate.split('T')[0] : '',
      monitorSideEffects: !!p.monitorSideEffects,
      maintainHygiene: !!p.maintainHygiene,
      prescriptionItems: p.prescriptionItems.map((it) => ({ ...it })),
    })
    setEditDialogOpen(true)
  }

  const handleAddItem = () => {
    setEditing((e) => ({
      ...e,
      prescriptionItems: [
        ...(e.prescriptionItems as PrescriptionItem[] | undefined) ?? [],
        { medicineName: '', strength: '', dosage: '', duration: '', notes: '' },
      ],
    }))
  }

  const handleRemoveItem = (idx: number) => {
    setEditing((e) => ({
      ...e,
      prescriptionItems: (e.prescriptionItems as PrescriptionItem[])
        ? (e.prescriptionItems as PrescriptionItem[]).filter((_, i) => i !== idx)
        : [],
    }))
  }

  const handleUpdate = async () => {
    if (!editing.id) {
      toast.error('Missing prescription ID')
      return
    }
    setIsUpdating(true)
    try {
      const payload: any = { id: editing.id, ...editing }
      // ensure followUpDate is either null or ISO
      if (payload.followUpDate === '') payload.followUpDate = null

      await axios.put('/api/prescriptions', payload)
      toast.success('Prescription updated')
      setEditDialogOpen(false)
      fetchPrescriptions()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to update prescription')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this prescription?')) return
    setIsDeleting(id)
    try {
      await axios.delete('/api/prescriptions', { params: { id } })
      toast.success('Prescription deleted')
      const newTotal = Math.max(0, total - 1)
      const lastPage = Math.max(1, Math.ceil(newTotal / (limit === 'all' ? newTotal || 1 : limit)))
      if (page > lastPage) setPage(lastPage)
      fetchPrescriptions()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete prescription')
    } finally {
      setIsDeleting(null)
    }
  }

  const handlePrint = (p: PrescriptionForm) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rows = p.prescriptionItems
      .map(
        (it, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #ccc">${i + 1}</td>
        <td style="padding:6px;border:1px solid #ccc">${it.medicineName}</td>
        <td style="padding:6px;border:1px solid #ccc">${it.strength || ''}</td>
        <td style="padding:6px;border:1px solid #ccc">${it.dosage}</td>
        <td style="padding:6px;border:1px solid #ccc">${it.duration}</td>
        <td style="padding:6px;border:1px solid #ccc">${it.notes || ''}</td>
      </tr>`
      )
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription #${String(p.id).padStart(5, '0')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { margin: 0 0 8px 0 }
            table { width: 100%; border-collapse: collapse; margin-top: 10px }
            td, th { padding: 6px; border: 1px solid #ccc; vertical-align: top }
            .header { text-align:center }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${window.location.origin}/logo.jpg" style="height:80px" /><br/>
            <strong>Animal Wellness Shop</strong><br/>
            9-Zubair Street, Islamia Park, Poonch Road, Chauburji, Lahore<br/>
            Phone: 03334145431; Email: animalwellnessshop@gmail.com
          </div>

          <h2>Prescription</h2>
          <p><strong>Ref#</strong> #${String(p.id).padStart(5, '0')} &nbsp; <strong>Date:</strong> ${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</p>

          <table>
            <tr><th style="background:#f3f3f3">Owner</th><td>${p.ownerName} (${p.ownerContact})</td></tr>
            <tr><th style="background:#f3f3f3">Animal</th><td>${p.animalSpecies} — ${p.breed}, ${p.age}, ${p.sex}</td></tr>
            <tr><th style="background:#f3f3f3">Doctor</th><td>${p.doctorName} ${p.qualification ? `, ${p.qualification}` : ''} ${p.clinicName ? `| ${p.clinicName}` : ''}</td></tr>
            <tr><th style="background:#f3f3f3">Diagnosis</th><td>${p.clinicalDiagnosis || ''} ${p.labDiagnosis ? `| Lab: ${p.labDiagnosis}` : ''}</td></tr>
          </table>

          <h3>Medications</h3>
          <table>
            <thead>
              <tr>
                <th style="background:#f3f3f3">#</th>
                <th style="background:#f3f3f3">Medicine</th>
                <th style="background:#f3f3f3">Strength</th>
                <th style="background:#f3f3f3">Dosage</th>
                <th style="background:#f3f3f3">Duration</th>
                <th style="background:#f3f3f3">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <p><strong>Continue previous medicine:</strong> ${p.continuePrevMedicine ? 'Yes' : 'No'}</p>
  <p><strong>Follow-up date:</strong> ${p.followUpDate ? new Date(p.followUpDate).toLocaleDateString() : '-'}</p>
  <p><strong>Monitor side effects:</strong> ${p.monitorSideEffects ? 'Yes' : 'No'}</p>
  <p><strong>Maintain hygiene:</strong> ${p.maintainHygiene ? 'Yes' : 'No'}</p>


        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">Prescriptions Management</h1>
          
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by owner, species, doctor, diagnosis..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="focus:ring-green-500 w-80"
            />

            <span>Show</span>
            <Select value={String(limit)} onValueChange={(v) => { setLimit(v === 'all' ? 'all' : Number(v)); setPage(1) }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>

          <div className="text-sm text-gray-600">Total entries: {total}</div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <TableHeader className="bg-gray-100 dark:bg-zinc-800">
                <TableRow>
                  <TableHead onClick={() => toggleSort('id')} className="cursor-pointer px-4 py-2">Ref# <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead onClick={() => toggleSort('ownerName')} className="cursor-pointer px-4 py-2">Owner <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead className="px-4 py-2">Contact</TableHead>
                  <TableHead className="px-4 py-2">Animal</TableHead>
                  <TableHead className="px-4 py-2">Doctor</TableHead>
                  <TableHead className="px-4 py-2">Diagnosis</TableHead>
                  <TableHead className="px-4 py-2">Created</TableHead>
                  <TableHead className="px-4 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {prescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">No prescriptions found.</TableCell>
                  </TableRow>
                ) : (
                  prescriptions.map((p, idx) => (
                    <TableRow key={p.id} className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}>
                      <TableCell className="px-4 py-2 font-mono text-sm">#{String(p.id).padStart(5, '0')}</TableCell>
                      <TableCell className="px-4 py-2 font-medium">{p.ownerName}</TableCell>
                      <TableCell className="px-4 py-2 text-sm">{p.ownerContact}</TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="text-sm">
                          <div className="font-medium">{p.animalSpecies}</div>
                          <div className="text-gray-500">{p.breed}, {p.age}, {p.sex}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm">{p.doctorName}</TableCell>
                      <TableCell className="px-4 py-2 text-sm truncate max-w-xs" title={p.clinicalDiagnosis || ''}>{p.clinicalDiagnosis || '-'}</TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleView(p)} title="View Details"><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handlePrint(p)} title="Print"><Printer className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)} disabled={isDeleting === p.id} title="Delete">
                            {isDeleting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {!isLoading && total > (limit === 'all' ? total : (limit as number)) && (
            <div className="mt-4 px-4 py-2 flex justify-center items-center">
              <div className="flex gap-2">
                <Button size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} variant="outline">Previous</Button>

                {Array.from({ length: Math.ceil(total / (limit === 'all' ? total || 1 : (limit as number))) }, (_, i) => i + 1).map((p) => (
                  <Button key={p} size="sm" variant={p === page ? 'default' : 'outline'} onClick={() => setPage(p)} className={p === page ? 'bg-green-500 text-white hover:bg-green-600' : ''}>{p}</Button>
                ))}

                <Button size="sm" disabled={page * (limit === 'all' ? total : (limit as number)) >= total} onClick={() => setPage((p) => p + 1)} variant="outline">Next</Button>
              </div>
            </div>
          )}
        </div>

        {/* View dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Prescription #{selected ? String(selected.id).padStart(5, '0') : ''}</DialogTitle>
            </DialogHeader>

            {selected && (
              <Tabs defaultValue="owner" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="owner">Owner</TabsTrigger>
                  <TabsTrigger value="doctor">Doctor</TabsTrigger>
                  <TabsTrigger value="items">Medications</TabsTrigger>
                  <TabsTrigger value="notes">Instructions</TabsTrigger>
                </TabsList>

                <TabsContent value="owner" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" />Owner & Animal</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Owner</label>
                        <p className="font-medium">{selected.ownerName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact</label>
                        <p className="font-medium">{selected.ownerContact}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-500">Animal</label>
                        <p className="font-medium">{selected.animalSpecies} — {selected.breed}, {selected.age}, {selected.sex}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="doctor" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Doctor & Clinic</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Doctor</label>
                        <p className="font-medium">{selected.doctorName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Qualification</label>
                        <p className="font-medium">{selected.qualification || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Clinic</label>
                        <p className="font-medium">{selected.clinicName || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact</label>
                        <p className="font-medium">{selected.clinicPhone || selected.clinicEmail || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Diagnosis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Clinical</label>
                        <p className="font-medium">{selected.clinicalDiagnosis || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Lab</label>
                        <p className="font-medium">{selected.labDiagnosis || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="items" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-4 w-4" />Medications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100"><th className="text-left p-2">#</th><th className="text-left p-2">Medicine</th><th className="text-left p-2">Strength</th><th className="text-left p-2">Dosage</th><th className="text-left p-2">Duration</th><th className="text-left p-2">Notes</th></tr>
                        </thead>
                        <tbody>
                          {selected.prescriptionItems.map((it, i) => (
                            <tr key={i} className="odd:bg-white even:bg-gray-50">
                              <td className="p-2 align-top">{i + 1}</td>
                              <td className="p-2 align-top">{it.medicineName}</td>
                              <td className="p-2 align-top">{it.strength || '-'}</td>
                              <td className="p-2 align-top">{it.dosage}</td>
                              <td className="p-2 align-top">{it.duration}</td>
                              <td className="p-2 align-top">{it.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Instructions & Flags</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Continue Prev Medicine</label>
                        <p className="font-medium">{selected.continuePrevMedicine ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Follow-up Date</label>
                        <p className="font-medium">{selected.followUpDate ? format(new Date(selected.followUpDate), 'PPP') : '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Monitor Side Effects</label>
                        <p className="font-medium">{selected.monitorSideEffects ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Maintain Hygiene</label>
                        <p className="font-medium">{selected.maintainHygiene ? 'Yes' : 'No'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={() => {
                if (selected) { setViewDialogOpen(false); handleEdit(selected) }
              }}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Prescription</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Doctor</label>
                  <Input value={editing.doctorName || ''} onChange={(e) => setEditing({ ...editing, doctorName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Qualification</label>
                  <Input value={editing.qualification || ''} onChange={(e) => setEditing({ ...editing, qualification: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Clinic Name</label>
                  <Input value={editing.clinicName || ''} onChange={(e) => setEditing({ ...editing, clinicName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Clinic Phone / Email</label>
                  <Input value={editing.clinicPhone || editing.clinicEmail || ''} onChange={(e) => setEditing({ ...editing, clinicPhone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Clinical Diagnosis</label>
                  <Input value={editing.clinicalDiagnosis || ''} onChange={(e) => setEditing({ ...editing, clinicalDiagnosis: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lab Diagnosis</label>
                  <Input value={editing.labDiagnosis || ''} onChange={(e) => setEditing({ ...editing, labDiagnosis: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">Medications</label>
                {(editing.prescriptionItems as PrescriptionItem[] | undefined)?.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-1">{idx + 1}.</div>
                    <div className="col-span-3">
                      <Input placeholder="Medicine" value={it.medicineName} onChange={(e) => {
                        const arr = (editing.prescriptionItems as PrescriptionItem[]).slice(); arr[idx] = { ...arr[idx], medicineName: e.target.value }; setEditing({ ...editing, prescriptionItems: arr })
                      }} />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="Strength" value={it.strength || ''} onChange={(e) => {
                        const arr = (editing.prescriptionItems as PrescriptionItem[]).slice(); arr[idx] = { ...arr[idx], strength: e.target.value }; setEditing({ ...editing, prescriptionItems: arr })
                      }} />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="Dosage" value={it.dosage} onChange={(e) => {
                        const arr = (editing.prescriptionItems as PrescriptionItem[]).slice(); arr[idx] = { ...arr[idx], dosage: e.target.value }; setEditing({ ...editing, prescriptionItems: arr })
                      }} />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="Duration" value={it.duration} onChange={(e) => {
                        const arr = (editing.prescriptionItems as PrescriptionItem[]).slice(); arr[idx] = { ...arr[idx], duration: e.target.value }; setEditing({ ...editing, prescriptionItems: arr })
                      }} />
                    </div>
                    <div className="col-span-1">
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(idx)}>Remove</Button>
                    </div>
                    <div className="col-span-12">
                      <Textarea placeholder="Notes" value={it.notes || ''} onChange={(e) => {
                        const arr = (editing.prescriptionItems as PrescriptionItem[]).slice(); arr[idx] = { ...arr[idx], notes: e.target.value }; setEditing({ ...editing, prescriptionItems: arr })
                      }} rows={2} />
                    </div>
                  </div>
                ))}

                <div>
                  <Button size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={!!editing.continuePrevMedicine} onCheckedChange={(v) => setEditing({ ...editing, continuePrevMedicine: !!v })} />
                  <label className="text-sm">Continue previous medicine</label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                  <Input type="date" value={editing.followUpDate || ''} onChange={(e) => setEditing({ ...editing, followUpDate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><Checkbox checked={!!editing.monitorSideEffects} onCheckedChange={(v) => setEditing({ ...editing, monitorSideEffects: !!v })} /><label>Monitor side effects</label></div>
                <div className="flex items-center gap-2"><Checkbox checked={!!editing.maintainHygiene} onCheckedChange={(v) => setEditing({ ...editing, maintainHygiene: !!v })} /><label>Maintain hygiene</label></div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setEditDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Updating...</>) : 'Update Prescription'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Suspense>
  )
}
