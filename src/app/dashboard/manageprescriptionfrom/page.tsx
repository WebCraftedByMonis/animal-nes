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
  TableHead as TableHeadCell,
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
  Printer,
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

/* ---------------------------
   Types
   --------------------------- */
interface HistoryForm {
  id: number
  name: string
  contact: string
  address: string
  animalSpecie: string
  breed: string
  age: string
  sex: string
  tag?: string | null
  use?: string | null
  createdAt: string
  updatedAt: string
}

interface PrescriptionItem {
  id?: number
  medicineName?: string | null
  strength?: string | null
  dosage?: string | null
  duration?: string | null
  notes?: string | null
}

interface PrescriptionForm {
  id: number
  prescriptionNo?: string | null
  doctorName?: string | null
  qualification?: string | null
  clinicName?: string | null
  clinicAddress?: string | null
  clinicPhone?: string | null
  clinicEmail?: string | null
  ownerName?: string | null
  ownerContact?: string | null
  animalSpecies?: string | null
  breed?: string | null
  age?: string | null
  sex?: string | null
  clinicalDiagnosis?: string | null
  labDiagnosis?: string | null
  continuePrevMedicine?: boolean | null
  followUpDate?: string | null
  monitorSideEffects?: boolean | null
  maintainHygiene?: boolean | null
  prescriptionItems?: PrescriptionItem[] | null
  historyForm?: HistoryForm | null
  createdAt?: string | null
  updatedAt?: string | null
}

/* ---------------------------
   Helpers (safe date formatting, escaping)
   --------------------------- */

function isValidDate(d: any) {
  return d instanceof Date && !isNaN(d.getTime())
}
function toDate(v?: string | null) {
  if (!v) return null
  const d = new Date(v)
  return isValidDate(d) ? d : null
}
function safeFormatISODate(v?: string | null, fmt = 'yyyy-MM-dd') {
  const d = toDate(v)
  if (!d) return ''
  try {
    return format(d, fmt)
  } catch {
    return ''
  }
}
function safeRelative(v?: string | null) {
  const d = toDate(v)
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '-'
}
function pad(n: number) {
  return String(n).padStart(2, '0')
}
function escapeHtml(str?: string | null) {
  if (!str) return ''
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

/* ---------------------------
   Component
   --------------------------- */

export default function PrescriptionsDashboardPage() {
  const [items, setItems] = useState<PrescriptionForm[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'doctorName'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [selected, setSelected] = useState<PrescriptionForm | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<PrescriptionForm> | null>(null)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  /* Fetch paginated list */
  const fetchPrescriptions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await axios.get('/api/prescriptions', {
        params: { search, sortBy, sortOrder, page, limit },
      })
      setItems(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch prescriptions')
    } finally {
      setIsLoading(false)
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  const toggleSort = (key: 'id' | 'doctorName') => {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  /* Open view — fetch if only id passed (makes sure historyForm included) */
  const handleView = async (idOrObj: number | PrescriptionForm) => {
    try {
      let pres: PrescriptionForm
      if (typeof idOrObj === 'number') {
        const res = await axios.get('/api/prescriptions', { params: { id: idOrObj } })
        pres = res.data
      } else {
        pres = idOrObj
      }
      setSelected(pres)
      setViewOpen(true)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load prescription')
    }
  }

  /* Open edit — fetch full record and prefill editing. Ensure prescriptionItems is an array (no padding). */
  const handleEdit = async (p: PrescriptionForm) => {
    try {
      const res = await axios.get('/api/prescriptions', { params: { id: p.id } })
      const dto = res.data as PrescriptionForm
      // ensure arrays exist
      dto.prescriptionItems = Array.isArray(dto.prescriptionItems) ? dto.prescriptionItems : []
      setEditing(dto)
      setEditOpen(true)
      // after editing opens, auto-resize textareas via effect (below)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load prescription for edit')
    }
  }

  /* Delete */
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this prescription?')) return
    setIsDeleting(id)
    try {
      await axios.delete('/api/prescriptions', { params: { id } })
      toast.success('Prescription deleted')
      const newTotal = Math.max(0, total - 1)
      const lastPage = Math.max(1, Math.ceil(newTotal / limit))
      if (page > lastPage) setPage(lastPage)
      fetchPrescriptions()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete prescription')
    } finally {
      setIsDeleting(null)
    }
  }

  /* Print (A4) - only non-empty items show, cells wrap, instructions printed */
  const handlePrint = (p: PrescriptionForm) => {
    const win = window.open('', '_blank')
    if (!win) return

    // filter only non-empty items
    const itemsArr = (p.prescriptionItems ?? []).filter(it =>
      (it.medicineName && it.medicineName.trim()) ||
      (it.strength && it.strength.trim()) ||
      (it.dosage && it.dosage.trim()) ||
      (it.duration && it.duration.trim()) ||
      (it.notes && it.notes.trim())
    )

    const itemsHtml = itemsArr.length === 0
      ? `<tr><td style="padding:8px;border:1px solid #ccc; white-space:pre-wrap;">&nbsp;</td><td style="padding:8px;border:1px solid #ccc;">&nbsp;</td><td style="padding:8px;border:1px solid #ccc;">&nbsp;</td><td style="padding:8px;border:1px solid #ccc;">&nbsp;</td><td style="padding:8px;border:1px solid #ccc;">&nbsp;</td></tr>`
      : itemsArr.map(it => `
          <tr>
            <td style="padding:8px;border:1px solid #ccc; white-space:pre-wrap;">${escapeHtml(it.medicineName || '')}</td>
            <td style="padding:8px;border:1px solid #ccc; white-space:pre-wrap;">${escapeHtml(it.strength || '')}</td>
            <td style="padding:8px;border:1px solid #ccc; white-space:pre-wrap;">${escapeHtml(it.dosage || '')}</td>
            <td style="padding:8px;border:1px solid #ccc; white-space:pre-wrap;">${escapeHtml(it.duration || '')}</td>
            <td style="padding:8px;border:1px solid #ccc; white-space:pre-wrap;">${escapeHtml(it.notes || '')}</td>
          </tr>
        `).join('')

    // instructions
    const checkedMark = (v?: boolean | null) => (v ? '☑' : '☐')
    const followUp = toDate(p.followUpDate ?? null)
    const followUpStr = followUp ? `${pad(followUp.getDate())} / ${pad(followUp.getMonth() + 1)} / ${followUp.getFullYear()}` : '____ / ____ / ______'

    const doctorName = escapeHtml(p.doctorName ?? '')

    win.document.write(`
      <html>
        <head>
          <title>Prescription #${String(p.id).padStart(5, '0')}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111; }
            .wrapper { padding: 12px 16px; }
            .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
            .clinic { text-align:left; font-weight:600; }
            .logo { height:80px; }
            .title { text-align:center; margin-top:6px; margin-bottom:6px; font-size:18px; font-weight:700; }
            .meta { font-size:13px; display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
            .section { margin-top:8px; }
            .label { font-weight:600; font-size:13px; margin-bottom:4px; display:block; }
            table { width:100%; border-collapse:collapse; margin-top:6px; }
            th, td { border:1px solid #ccc; padding:8px; vertical-align:top; font-size:13px; white-space:pre-wrap; word-break:break-word; }
            .instructions { margin-top:10px; font-size:13px; line-height:1.6; }
            .checkbox-mark { display:inline-block; width:18px; text-align:center; margin-right:8px; font-weight:700; }
            .small { font-size:12px; color:#444; }
            .clinic-right { text-align:right; font-size:13px; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <div class="clinic">
                <div>Animal WellNess Shop</div>
                <div class="small">9-Zubair Street, Islamia Park, Poonch Road, Chauburji, Lahore</div>
                <div class="small">Phone: 03334145431; Email: animalwellnessshop@gmail.com</div>
              </div>
              <div style="text-align:right">
                <img src="${window.location.origin}/logo.jpg" class="logo" alt="logo" />
                <div style="margin-top:6px" class="small">${doctorName}</div>
              </div>
            </div>

            <div class="title">Veterinary Prescription Pad</div>

            <div class="meta">
              <div><span class="label">Doctor:</span> ${doctorName || '____________________'}</div>
              <div class="clinic-right">
                <div><span class="label">Dated:</span> _____________________</div>
                <div><span class="label">Prescription No.:</span> ${p.prescriptionNo ? escapeHtml(p.prescriptionNo) : '_____________'}</div>
              </div>
            </div>

            <div class="section">
              <div class="label">Clinic / Vet Information</div>
              <div style="display:flex; gap:12px;">
                <div style="flex:1">
                  <div class="small">Name:</div>
                  <div>${escapeHtml(p.clinicName || '_________________________________________')}</div>
                </div>
                <div style="flex:1">
                  <div class="small">Clinic / Hospital:</div>
                  <div>${escapeHtml(p.clinicName || '_______________________________')}</div>
                </div>
              </div>
              <div style="margin-top:6px">
                <div class="small">Address:</div>
                <div>${escapeHtml(p.clinicAddress || '_______________________________________')}</div>
              </div>
              <div style="display:flex; gap:12px; margin-top:6px;">
                <div style="flex:1">
                  <div class="small">Phone / WhatsApp:</div>
                  <div>${escapeHtml(p.clinicPhone || '________________________')}</div>
                </div>
                <div style="flex:1">
                  <div class="small">Email (optional):</div>
                  <div>${escapeHtml(p.clinicEmail || '________________________')}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div style="display:flex; gap:12px;">
                <div style="flex:1">
                  <div class="small">Owner Name:</div>
                  <div>${escapeHtml(p.ownerName || '________________________')}</div>
                </div>
                <div style="flex:1">
                  <div class="small">Contact:</div>
                  <div>${escapeHtml(p.ownerContact || '________________________')}</div>
                </div>
              </div>

              <div style="display:flex; gap:12px; margin-top:8px;">
                <div style="flex:1">
                  <div class="small">Animal Species:</div>
                  <div>${escapeHtml(p.animalSpecies || '_______________________')}</div>
                </div>
                <div style="flex:1">
                  <div class="small">Breed / Age / Sex:</div>
                  <div>${escapeHtml(p.breed || '_____')} &nbsp; ${escapeHtml(p.age || '___')} &nbsp; Sex: ${escapeHtml(p.sex || '___')}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="label">Clinical Diagnosis / Findings:</div>
              <div style="min-height:34px; border-bottom:1px dashed #ddd; margin-top:6px">${escapeHtml(p.clinicalDiagnosis || '')}</div>
              <div style="margin-top:10px" class="label">Lab Diagnosis / Test Results:</div>
              <div style="min-height:34px; border-bottom:1px dashed #ddd; margin-top:6px">${escapeHtml(p.labDiagnosis || '')}</div>
            </div>

            <div class="section">
              <div class="label">Prescription</div>
              <table>
                <thead>
                  <tr>
                    <th>Medicine / Product Name</th>
                    <th>Strength</th>
                    <th>Dosage</th>
                    <th>Duration</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="instructions">
              <div class="label">Instructions to Owner:</div>
              <div style="margin-top:8px;">
                <div><span class="checkbox-mark">${checkedMark(p.continuePrevMedicine)}</span> Continue previous medicines as advised</div>
                <div style="margin-top:6px"><span class="checkbox-mark">${checkedMark(p.monitorSideEffects)}</span> Monitor for side effects</div>
                <div style="margin-top:6px"><span class="checkbox-mark">${checkedMark(p.maintainHygiene)}</span> Maintain hygiene and biosecurity</div>
                <div style="margin-top:8px"><span class="label">Follow-up on:</span> &nbsp; ${followUpStr}</div>
              </div>
              <div style="margin-top:12px; font-size:12px;">*A computer-generated signature is not needed.</div>
            </div>
          </div>
        </body>
      </html>
    `)

    win.document.close()
    win.print()
  }

  /* Update (PUT) — filter out blank items before sending */
  const handleEditUpdate = async () => {
    if (!editing || !editing.id) {
      toast.error('Missing prescription id')
      return
    }
    setIsUpdating(true)
    try {
      const payload: any = { ...editing }
      // normalize followUpDate
      if (!payload.followUpDate) {
        payload.followUpDate = null
      } else {
        const d = new Date(payload.followUpDate as any)
        payload.followUpDate = isValidDate(d) ? d.toISOString() : null
      }

      // filter blank prescription items
      payload.prescriptionItems = (payload.prescriptionItems || []).filter((it: PrescriptionItem) =>
        !!((it.medicineName && it.medicineName.toString().trim()) ||
           (it.strength && it.strength.toString().trim()) ||
           (it.dosage && it.dosage.toString().trim()) ||
           (it.duration && it.duration.toString().trim()) ||
           (it.notes && it.notes.toString().trim()))
      )

      await axios.put('/api/prescriptions', payload)
      toast.success('Prescription updated')
      setEditOpen(false)
      fetchPrescriptions()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to update prescription')
    } finally {
      setIsUpdating(false)
    }
  }

  /* edit item helpers: DO NOT pad to fixed rows. Show existing items only + one trailing blank row (implicit add) */
  const setEditField = (key: keyof PrescriptionForm, value: any) =>
    setEditing((e) => (e ? { ...e, [key]: value } : e))

  const setEditItem = (idx: number, key: keyof PrescriptionItem, value: any) =>
    setEditing((e) => {
      if (!e) return e
      const copy = { ...e }
      const arr = Array.isArray(copy.prescriptionItems) ? [...copy.prescriptionItems] : []
      while (arr.length <= idx) {
        arr.push({ medicineName: '', strength: '', dosage: '', duration: '', notes: '' })
      }
      arr[idx] = { ...arr[idx], [key]: value }
      copy.prescriptionItems = arr
      return copy
    })

  /* auto-resize textarea helper & effect to resize when editing opens or content changes */
  function autoResizeTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    if (!editOpen) return
    // after open, resize all textareas in dialog
    const handle = setTimeout(() => {
      const taList = document.querySelectorAll<HTMLTextAreaElement>('.prescription-edit-dialog textarea')
      taList.forEach(autoResizeTextarea)
    }, 120)
    return () => clearTimeout(handle)
  }, [editOpen, editing])

  /* utility for view table rows: filter only non-empty */
  const nonEmptyItems = (arr?: PrescriptionItem[] | null) => {
    return (arr || []).filter(it =>
      !!((it.medicineName && it.medicineName.toString().trim()) ||
         (it.strength && it.strength.toString().trim()) ||
         (it.dosage && it.dosage.toString().trim()) ||
         (it.duration && it.duration.toString().trim()) ||
         (it.notes && it.notes.toString().trim()))
    )
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">Prescriptions</h1>
          <Link href="/dashboard/prescriptions/new">
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Prescription
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by owner, animal, doctor, diagnosis..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="focus:ring-green-500 w-80"
            />
            <span>Show</span>
            <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>

          <div className="text-sm text-gray-600">Total: {total}</div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <TableHeader className="bg-gray-100 dark:bg-zinc-800">
                <TableRow>
                  <TableHeadCell onClick={() => toggleSort('id')} className="cursor-pointer px-4 py-2">Ref# <ArrowUpDown className="inline h-4 w-4" /></TableHeadCell>
                  <TableHeadCell onClick={() => toggleSort('doctorName')} className="cursor-pointer px-4 py-2">Doctor <ArrowUpDown className="inline h-4 w-4" /></TableHeadCell>
                  <TableHeadCell className="px-4 py-2">Owner</TableHeadCell>
                  <TableHeadCell className="px-4 py-2">Animal</TableHeadCell>
                  <TableHeadCell className="px-4 py-2">Diagnosis</TableHeadCell>
                  <TableHeadCell className="px-4 py-2">Items</TableHeadCell>
                  <TableHeadCell className="px-4 py-2">Created</TableHeadCell>
                  <TableHeadCell className="px-4 py-2">Actions</TableHeadCell>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">No prescriptions found.</TableCell>
                  </TableRow>
                ) : (
                  items.map((p, idx) => (
                    <TableRow key={p.id} className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}>
                      <TableCell className="px-4 py-2 font-mono text-sm">#{String(p.id).padStart(5, '0')}</TableCell>
                      <TableCell className="px-4 py-2 font-medium">{p.doctorName || '-'}</TableCell>
                      <TableCell className="px-4 py-2 text-sm">
                        {p.ownerName || '-'}
                        <div className="text-gray-500 text-xs">{p.ownerContact || ''}</div>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="text-sm">
                          <div className="font-medium">{p.animalSpecies || '-'}</div>
                          <div className="text-gray-500">{[p.breed, p.age, p.sex].filter(Boolean).join(', ')}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm">{p.clinicalDiagnosis || '-'}</TableCell>
                      <TableCell className="px-4 py-2 text-sm">{(p.prescriptionItems || []).length}</TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600">{safeRelative(p.createdAt)}</TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleView(p)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handlePrint(p)} title="Print">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)} disabled={isDeleting === p.id}>
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
        </div>

        {/* View Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Prescription #{selected ? String(selected.id).padStart(5, '0') : ''}
              </DialogTitle>
            </DialogHeader>

            {selected && (
              <Tabs defaultValue="prescription" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="prescription">Prescription</TabsTrigger>
                  <TabsTrigger value="owner">Owner</TabsTrigger>
                  <TabsTrigger value="animal">Animal</TabsTrigger>
                  <TabsTrigger value="items">Items</TabsTrigger>
                </TabsList>

                <TabsContent value="prescription" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Prescription Info</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Doctor</label>
                        <p className="font-medium">{selected.doctorName || '-' } {selected.qualification ? `(${selected.qualification})` : ''}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Clinic</label>
                        <p className="font-medium">{selected.clinicName || '-'} {selected.clinicPhone ? `· ${selected.clinicPhone}` : ''}</p>
                        <p className="text-sm text-gray-500">{selected.clinicAddress || ''}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Prescription No.</label>
                        <p className="font-medium">{selected.prescriptionNo || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Dated</label>
                        <p className="font-medium">{safeFormatISODate(selected.createdAt, 'PPP') || '-'}</p>
                      </div>
                    </CardContent>

                    {/* Instructions to Owner shown here */}
                    <CardContent>
                      <div className="mt-2">
                        <div className="text-sm font-semibold mb-2">Instructions to Owner</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={!!selected.continuePrevMedicine} />
                            <span>Continue previous medicines as advised</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox checked={!!selected.monitorSideEffects} />
                            <span>Monitor for side effects</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox checked={!!selected.maintainHygiene} />
                            <span>Maintain hygiene and biosecurity</span>
                          </div>
                          <div>
                            <div className="text-sm">Follow-up on</div>
                            <div className="font-medium">{selected.followUpDate ? safeFormatISODate(selected.followUpDate, 'dd / MM / yyyy') : '____ / ____ / ______'}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="owner" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Owner</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div><strong>{selected.ownerName || '-'}</strong></div>
                      <div className="text-sm text-gray-500">{selected.ownerContact || '-'}</div>
                      {selected.historyForm?.address && <div className="mt-2">{selected.historyForm.address}</div>}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="animal" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Animal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Species</label>
                          <p className="font-medium">{selected.animalSpecies || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Breed</label>
                          <p className="font-medium">{selected.breed || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Age</label>
                          <p className="font-medium">{selected.age || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Sex</label>
                          <p className="font-medium">{selected.sex || '-'}</p>
                        </div>
                      </div>
                      {selected.historyForm && (
                        <div className="mt-4">
                          <Badge variant="outline">Linked History #{String(selected.historyForm.id).padStart(5, '0')}</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="items" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Prescription Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="py-2">Medicine</th>
                              <th className="py-2">Strength</th>
                              <th className="py-2">Dosage</th>
                              <th className="py-2">Duration</th>
                              <th className="py-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nonEmptyItems(selected.prescriptionItems).map((it, i) => (
                              <tr key={i} className="border-b">
                                <td className="py-2" style={{ whiteSpace: 'pre-wrap' }}>{it.medicineName || '-'}</td>
                                <td className="py-2" style={{ whiteSpace: 'pre-wrap' }}>{it.strength || '-'}</td>
                                <td className="py-2" style={{ whiteSpace: 'pre-wrap' }}>{it.dosage || '-'}</td>
                                <td className="py-2" style={{ whiteSpace: 'pre-wrap' }}>{it.duration || '-'}</td>
                                <td className="py-2" style={{ whiteSpace: 'pre-wrap' }}>{it.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={() => { if (selected) { setViewOpen(false); handleEdit(selected) } }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog: All fields + dynamic medicine rows (no Add button) */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="prescription-edit-dialog">
              <DialogHeader>
                <DialogTitle>Edit Prescription (all fields)</DialogTitle>
              </DialogHeader>

              {editing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Doctor</label>
                      <Input value={editing.doctorName || ''} onChange={(e) => setEditField('doctorName', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Qualification</label>
                      <Input value={editing.qualification || ''} onChange={(e) => setEditField('qualification', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Prescription No.</label>
                      <Input value={editing.prescriptionNo || ''} onChange={(e) => setEditField('prescriptionNo', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Dated (Created at)</label>
                      <Input value={editing.createdAt ? safeFormatISODate(editing.createdAt, 'yyyy-MM-dd') : ''} readOnly />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Clinic / Hospital</label>
                      <Input value={editing.clinicName || ''} onChange={(e) => setEditField('clinicName', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Clinic Address</label>
                      <Input value={editing.clinicAddress || ''} onChange={(e) => setEditField('clinicAddress', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Phone / WhatsApp</label>
                      <Input value={editing.clinicPhone || ''} onChange={(e) => setEditField('clinicPhone', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <Input value={editing.clinicEmail || ''} onChange={(e) => setEditField('clinicEmail', e.target.value)} />
                    </div>
                  </div>

                  {/* Owner & Animal full fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Owner Name</label>
                      <Input value={editing.ownerName || ''} onChange={(e) => setEditField('ownerName', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Owner Contact</label>
                      <Input value={editing.ownerContact || ''} onChange={(e) => setEditField('ownerContact', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Animal Species</label>
                      <Input value={editing.animalSpecies || ''} onChange={(e) => setEditField('animalSpecies', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Breed</label>
                      <Input value={editing.breed || ''} onChange={(e) => setEditField('breed', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Age</label>
                      <Input value={editing.age || ''} onChange={(e) => setEditField('age', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Sex</label>
                      <Input value={editing.sex || ''} onChange={(e) => setEditField('sex', e.target.value)} />
                    </div>
                  </div>

                  {/* Clinical & Lab */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Clinical Diagnosis / Findings</label>
                      <Textarea value={editing.clinicalDiagnosis || ''} onChange={(e) => setEditField('clinicalDiagnosis', e.target.value)} rows={3} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Lab Diagnosis / Test Results</label>
                      <Textarea value={editing.labDiagnosis || ''} onChange={(e) => setEditField('labDiagnosis', e.target.value)} rows={3} />
                    </div>
                  </div>

                  {/* Prescription items — dynamic rows: show existing items and one trailing blank row */}
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Prescription</h3>
                      <div className="text-sm text-gray-500">Rows grow with content — type in trailing blank row to add</div>
                    </div>

                    <div className="mt-2 space-y-2">
                      {(() => {
                        // build itemsToRender: existing items + one trailing blank row for implicit add
                        const existing = Array.isArray(editing.prescriptionItems) ? editing.prescriptionItems : []
                        const itemsToRender = [...existing]
                        itemsToRender.push({ medicineName: '', strength: '', dosage: '', duration: '', notes: '' })
                        return itemsToRender.map((it, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                            <div className="md:col-span-2">
                              <label className="text-sm text-gray-500">Medicine / Product Name</label>
                              <textarea
                                value={it.medicineName || ''}
                                onChange={(e) => setEditItem(idx, 'medicineName', e.target.value)}
                                onInput={(e) => autoResizeTextarea(e.currentTarget)}
                                className="w-full p-2 border rounded resize-none"
                                rows={1}
                                placeholder="Medicine name"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500">Strength</label>
                              <Input value={it.strength || ''} onChange={(e) => setEditItem(idx, 'strength', e.target.value)} />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500">Dosage</label>
                              <Input value={it.dosage || ''} onChange={(e) => setEditItem(idx, 'dosage', e.target.value)} />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500">Duration</label>
                              <Input value={it.duration || ''} onChange={(e) => setEditItem(idx, 'duration', e.target.value)} />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500">Notes</label>
                              <textarea
                                value={it.notes || ''}
                                onChange={(e) => setEditItem(idx, 'notes', e.target.value)}
                                onInput={(e) => autoResizeTextarea(e.currentTarget)}
                                className="w-full p-2 border rounded resize-none"
                                rows={1}
                                placeholder="Notes (if any)"
                              />
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>

                  {/* Instructions — owner */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={!!editing.continuePrevMedicine} onCheckedChange={(v) => setEditField('continuePrevMedicine', !!v)} />
                        <span>Continue previous medicines as advised</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox checked={!!editing.monitorSideEffects} onCheckedChange={(v) => setEditField('monitorSideEffects', !!v)} />
                        <span>Monitor for side effects</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox checked={!!editing.maintainHygiene} onCheckedChange={(v) => setEditField('maintainHygiene', !!v)} />
                        <span>Maintain hygiene and biosecurity</span>
                      </div>

                      <div>
                        <label className="text-sm text-gray-500">Follow-up on</label>
                        <Input type="date" value={editing.followUpDate ? String(editing.followUpDate).split('T')[0] : ''} onChange={(e) => setEditField('followUpDate', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={isUpdating}>Cancel</Button>
                <Button className="bg-green-500 hover:bg-green-600" onClick={handleEditUpdate} disabled={isUpdating}>
                  {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Prescription'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
