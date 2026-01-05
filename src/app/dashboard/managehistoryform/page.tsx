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
  User,
  Heart,
  Syringe,
  AlertCircle,
  Home,
  Activity,
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
}

export default function ViewHistoryFormsPage() {
  const [historyForms, setHistoryForms] = useState<HistoryForm[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'name'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [selectedForm, setSelectedForm] = useState<HistoryForm | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingForm, setEditingForm] = useState<Partial<HistoryForm>>({})

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Fetch list from API
  const fetchHistoryForms = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await axios.get('/api/history-forms', {
        params: { search, sortBy, sortOrder, page, limit },
      })
      // Expecting { data: HistoryForm[], total: number }
      setHistoryForms(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      console.error(error)
      toast.error('Failed to fetch history forms')
    } finally {
      setIsLoading(false)
    }
  }, [search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchHistoryForms()
  }, [fetchHistoryForms])

  // View a form
  const handleView = (form: HistoryForm) => {
    setSelectedForm(form)
    setViewDialogOpen(true)
  }

  // Open edit dialog and preload fields
  const handleEdit = (form: HistoryForm) => {
    // clone so edits don't mutate list directly
    setEditingForm({ ...form })
    setEditDialogOpen(true)
  }

  // Update API
  const handleUpdate = async () => {
    if (!editingForm.id) {
      toast.error('Missing form ID')
      return
    }

    setIsUpdating(true)
    try {
      await axios.put('/api/history-forms', editingForm)
      toast.success('History form updated successfully')
      setEditDialogOpen(false)
      // refresh list
      fetchHistoryForms()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.response?.data?.error || 'Failed to update history form')
    } finally {
      setIsUpdating(false)
    }
  }

  // Delete API
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this history form?')) return

    setIsDeleting(id)
    try {
      await axios.delete('/api/history-forms', { params: { id } })
      toast.success('History form deleted successfully')
      // if deleting last item on page, go back a page if necessary
      const newTotal = Math.max(0, total - 1)
      const lastPage = Math.max(1, Math.ceil(newTotal / limit))
      if (page > lastPage) setPage(lastPage)
      fetchHistoryForms()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete history form')
    } finally {
      setIsDeleting(null)
    }
  }

  // Basic print — you can improve to open a print-only window
  const handlePrint = (form: HistoryForm) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>History Form #${form.id.toString().padStart(5, '0')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; }
          .logo { height: 80px; }
          h2 { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          td { padding: 6px; vertical-align: top; }
          .section-title { font-weight: bold; background: #eee; padding: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/logo.jpg" class="logo" /><br/>
          <strong>Animal Wellness Shop</strong><br/>
          67-K Block, Commercial Market, DHA Phase-1, Lahore<br/>
          Phone: 03334145431; Email: animalwellnessshop@gmail.com
        </div>

        <p><strong>Reference Number:</strong> #${form.id.toString().padStart(5, '0')}<br/>
        <strong>Dated:</strong> ${form.createdAt ? new Date(form.createdAt).toLocaleDateString() : ''}</p>

        <h2>Animal History Form</h2>

        <table border="1">
          <tr><td colspan="2" class="section-title">Owner / Farm Information</td></tr>
          <tr><td>Name: ${form.name}</td><td>Contact: ${form.contact}</td></tr>
          <tr><td colspan="2">Address: ${form.address}</td></tr>

          <tr><td colspan="2" class="section-title">Animal Identification</td></tr>
          <tr><td>Species: ${form.animalSpecie}</td><td>Breed: ${form.breed}</td></tr>
          <tr><td>Age: ${form.age}</td><td>Sex: ${form.sex}</td></tr>
          <tr><td>Tag/Microchip: ${form.tag || ''}</td><td>Purpose/Use: ${form.use || ''}</td></tr>

          <tr><td colspan="2" class="section-title">Presenting Complaint</td></tr>
          <tr><td colspan="2">Main Issue: ${form.mainIssue} | Duration: ${form.duration}</td></tr>

          <tr><td colspan="2" class="section-title">Medical History</td></tr>
          <tr><td colspan="2">Past illness/treatment: ${form.pastIllness || ''}</td></tr>
          <tr><td>Allergies: ${form.allergies || ''}</td><td>Surgeries: ${form.surgeries || ''}</td></tr>

          <tr><td colspan="2" class="section-title">Reproductive Status</td></tr>
          <tr><td>Status: ${form.reproductiveStatus || ''}</td><td>Last Event: ${form.lastEvent || ''}</td></tr>

          <tr><td colspan="2" class="section-title">Management & Nutrition</td></tr>
          <tr><td>Diet: ${form.diet || ''}</td><td>Water: ${form.water || ''}</td></tr>
          <tr><td colspan="2">Housing: ${form.housing || ''}</td></tr>

          <tr><td colspan="2" class="section-title">Production Records</td></tr>
          <tr><td>Milk/day: ${form.milkPerDay || ''} L</td><td>Eggs/day: ${form.eggPerDay || ''} | Weight Gain: ${form.weightGain || ''}</td></tr>

          <tr><td colspan="2" class="section-title">Vaccination / Deworming</td></tr>
          <tr><td>Last given: ${form.lastGiven || ''}</td><td>Next due: ${form.nextDue || ''}</td></tr>

          <tr><td colspan="2" class="section-title">Risks</td></tr>
          <tr><td colspan="2">${getRiskFactors(form).join(', ') || 'None'}</td></tr>

          <tr><td colspan="2" class="section-title">Examination</td></tr>
          <tr><td>Examined by: ${form.examinedBy || ''}</td><td>Date: ${form.examinationDate || ''}</td></tr>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
};

  const toggleSort = (key: 'id' | 'name') => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const getRiskFactors = (form: HistoryForm) => {
    const risks: string[] = []
    if (form.newAnimalContact) risks.push('New Contact')
    if (form.transport) risks.push('Transport')
    if (form.outbreakNearby) risks.push('Outbreak')
    if (form.wildlife) risks.push('Wildlife')
    if (form.parasites) risks.push('Parasites')
    return risks
  }

  // helper to safely read boolean-ish fields from editingForm
  const bool = (v: any) => !!v

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">History Forms Management</h1>
          
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by name, species, breed, issue..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="focus:ring-green-500 w-80"
            />
            <span>Show</span>
            <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>

          <div className="text-sm text-gray-600">Total entries: {total}</div>
        </div>

        {/* Table container */}
        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <TableHeader className="bg-gray-100 dark:bg-zinc-800">
                <TableRow>
                  <TableHead onClick={() => toggleSort('id')} className="cursor-pointer px-4 py-2">
                    Ref# <ArrowUpDown className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead onClick={() => toggleSort('name')} className="cursor-pointer px-4 py-2">
                    Owner <ArrowUpDown className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead className="px-4 py-2">Contact</TableHead>
                  <TableHead className="px-4 py-2">Animal</TableHead>
                  <TableHead className="px-4 py-2">Main Issue</TableHead>
                  <TableHead className="px-4 py-2">Duration</TableHead>
                  <TableHead className="px-4 py-2">Risk Factors</TableHead>
                  <TableHead className="px-4 py-2">Examined By</TableHead>
                  <TableHead className="px-4 py-2">Created</TableHead>
                  <TableHead className="px-4 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {historyForms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No history forms found. Click "Add New History Form" to create your first record.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyForms.map((form, idx) => (
                    <TableRow
                      key={form.id}
                      className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                    >
                      <TableCell className="px-4 py-2 font-mono text-sm">#{String(form.id).padStart(5, '0')}</TableCell>
                      <TableCell className="px-4 py-2 font-medium">{form.name}</TableCell>
                      <TableCell className="px-4 py-2 text-sm">{form.contact}</TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="text-sm">
                          <div className="font-medium">{form.animalSpecie}</div>
                          <div className="text-gray-500">{form.breed}, {form.age}, {form.sex}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <p className="text-sm truncate max-w-xs" title={form.mainIssue}>{form.mainIssue}</p>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm">{form.duration}</TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {getRiskFactors(form).map((risk, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{risk}</Badge>
                          ))}
                          {getRiskFactors(form).length === 0 && <span className="text-gray-400 text-sm">None</span>}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm">{form.examinedBy || '-'}</TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600">
                        {formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleView(form)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(form)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handlePrint(form)} title="Print">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(form.id)}
                            disabled={isDeleting === form.id}
                            title="Delete"
                          >
                            {isDeleting === form.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!isLoading && total > limit && (
            <div className="mt-4 px-4 py-2 flex justify-center items-center">
              <div className="flex gap-2">
                <Button size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} variant="outline">Previous</Button>

                {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? 'default' : 'outline'}
                    onClick={() => setPage(p)}
                    className={p === page ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                  >
                    {p}
                  </Button>
                ))}

                <Button size="sm" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)} variant="outline">Next</Button>
              </div>
            </div>
          )}
        </div>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                History Form #{selectedForm ? String(selectedForm.id).padStart(5, '0') : ''}
              </DialogTitle>
            </DialogHeader>

            {selectedForm && (
              <Tabs defaultValue="owner" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="owner">Owner</TabsTrigger>
                  <TabsTrigger value="animal">Animal</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                  <TabsTrigger value="management">Management</TabsTrigger>
                  <TabsTrigger value="examination">Examination</TabsTrigger>
                </TabsList>

                <TabsContent value="owner" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Owner Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="font-medium">{selectedForm.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact</label>
                        <p className="font-medium">{selectedForm.contact}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="font-medium">{selectedForm.address}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="animal" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Animal Identification</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Species</label>
                        <p className="font-medium">{selectedForm.animalSpecie}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Breed</label>
                        <p className="font-medium">{selectedForm.breed}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Age</label>
                        <p className="font-medium">{selectedForm.age}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Sex</label>
                        <p className="font-medium">{selectedForm.sex}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tag/Microchip</label>
                        <p className="font-medium">{selectedForm.tag || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Purpose/Use</label>
                        <p className="font-medium">{selectedForm.use || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="medical" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Medical History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Main Issue</label>
                          <p className="font-medium">{selectedForm.mainIssue}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Duration</label>
                          <p className="font-medium">{selectedForm.duration}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Past Illness/Treatment</label>
                        <p className="font-medium">{selectedForm.pastIllness || selectedForm.pastTreatment || '-'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Allergies</label>
                          <p className="font-medium">{selectedForm.allergies || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Surgeries</label>
                          <p className="font-medium">{selectedForm.surgeries || '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Syringe className="h-4 w-4" />
                        Vaccination/Deworming
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p className="font-medium">
                          {selectedForm.vaccinationDeworming ? (
                            <Badge className="bg-green-100 text-green-800">Done</Badge>
                          ) : (
                            <Badge variant="outline">Not Done</Badge>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Last Given</label>
                        <p className="font-medium">{selectedForm.lastGiven || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Next Due</label>
                        <p className="font-medium">{selectedForm.nextDue || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="management" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Management & Nutrition
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Diet</label>
                        <p className="font-medium">{selectedForm.diet || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Water</label>
                        <p className="font-medium">{selectedForm.water || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Housing</label>
                        <p className="font-medium">{selectedForm.housing || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Reproductive Status</label>
                        <p className="font-medium">{selectedForm.reproductiveStatus || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Production Records
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Milk/Day</label>
                        <p className="font-medium">{selectedForm.milkPerDay ? `${selectedForm.milkPerDay} L` : '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Eggs/Day</label>
                        <p className="font-medium">{selectedForm.eggPerDay || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Weight Gain</label>
                        <p className="font-medium">{selectedForm.weightGain || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Risk Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { key: 'newAnimalContact', label: 'New Animal Contact' },
                          { key: 'transport', label: 'Transport' },
                          { key: 'outbreakNearby', label: 'Outbreak Nearby' },
                          { key: 'wildlife', label: 'Wildlife' },
                          { key: 'parasites', label: 'Parasites' },
                        ].map((risk) => {
                          const truthy = !!(selectedForm as any)[risk.key]
                          return (
                            <Badge
                              key={risk.key}
                              variant={truthy ? 'default' : 'outline'}
                              className={truthy ? 'bg-red-100 text-red-800' : ''}
                            >
                              {risk.label}
                            </Badge>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="examination" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Examination Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Reference Number</label>
                        <p className="font-medium font-mono">#{String(selectedForm.id).padStart(5, '0')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Examined By</label>
                        <p className="font-medium">{selectedForm.examinedBy || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Examination Date</label>
                        <p className="font-medium">{selectedForm.examinationDate ? format(new Date(selectedForm.examinationDate), 'PPP') : '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created At</label>
                        <p className="font-medium">{format(new Date(selectedForm.createdAt), 'PPP')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                onClick={() => {
                  if (selectedForm) {
                    setViewDialogOpen(false)
                    handleEdit(selectedForm)
                  }
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit History Form</DialogTitle>
            </DialogHeader>

            {/* --- Edit form fields (kept comprehensive) --- */}
            <div className="space-y-4">
              {/* Owner fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Owner Name</label>
                  <Input
                    value={editingForm.name || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact</label>
                  <Input
                    value={editingForm.contact || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, contact: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Input
                  value={editingForm.address || ''}
                  onChange={(e) => setEditingForm({ ...editingForm, address: e.target.value })}
                />
              </div>

              {/* Animal identification */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Animal Species</label>
                  <Input
                    value={editingForm.animalSpecie || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, animalSpecie: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Breed</label>
                  <Input
                    value={editingForm.breed || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, breed: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Age</label>
                  <Input
                    value={editingForm.age || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, age: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sex</label>
                  <Select
                    value={editingForm.sex || ''}
                    onValueChange={(value) => setEditingForm({ ...editingForm, sex: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tag/Microchip</label>
                  <Input
                    value={editingForm.tag || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, tag: e.target.value })}
                  />
                </div>
              </div>

              {/* Medical & management */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Main Issue</label>
                  <Textarea
                    value={editingForm.mainIssue || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, mainIssue: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration</label>
                  <Input
                    value={editingForm.duration || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, duration: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Past Illness</label>
                  <Input
                    value={editingForm.pastIllness || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, pastIllness: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Past Treatment</label>
                  <Textarea
                    value={editingForm.pastTreatment || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, pastTreatment: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Allergies</label>
                  <Input
                    value={editingForm.allergies || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, allergies: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Surgeries</label>
                  <Input
                    value={editingForm.surgeries || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, surgeries: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Diet</label>
                  <Input
                    value={editingForm.diet || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, diet: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Water Source</label>
                  <Select
                    value={editingForm.water || ''}
                    onValueChange={(value) => setEditingForm({ ...editingForm, water: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select water" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clean">Clean</SelectItem>
                      <SelectItem value="Natural">Natural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Housing</label>
                  <Select
                    value={editingForm.housing || ''}
                    onValueChange={(value) => setEditingForm({ ...editingForm, housing: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select housing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stall">Stall</SelectItem>
                      <SelectItem value="Yard">Yard</SelectItem>
                      <SelectItem value="Cage">Cage</SelectItem>
                      <SelectItem value="Free-range">Free-range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Milk/Day (L)</label>
                  <Input
                    value={editingForm.milkPerDay || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, milkPerDay: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Eggs/Day</label>
                  <Input
                    value={editingForm.eggPerDay || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, eggPerDay: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Weight Gain</label>
                  <Input
                    value={editingForm.weightGain || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, weightGain: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Last Vaccination Given</label>
                  <Input
                    type="date"
                    value={editingForm.lastGiven || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, lastGiven: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Next Vaccination Due</label>
                  <Input
                    type="date"
                    value={editingForm.nextDue || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, nextDue: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Risk Factors</label>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bool(editingForm.newAnimalContact)}
                      onCheckedChange={(v) => setEditingForm({ ...editingForm, newAnimalContact: !!v })}
                    />
                    <label className="text-sm">New Animal Contact</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bool(editingForm.transport)}
                      onCheckedChange={(v) => setEditingForm({ ...editingForm, transport: !!v })}
                    />
                    <label className="text-sm">Transport</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bool(editingForm.outbreakNearby)}
                      onCheckedChange={(v) => setEditingForm({ ...editingForm, outbreakNearby: !!v })}
                    />
                    <label className="text-sm">Outbreak Nearby</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bool(editingForm.wildlife)}
                      onCheckedChange={(v) => setEditingForm({ ...editingForm, wildlife: !!v })}
                    />
                    <label className="text-sm">Wildlife</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bool(editingForm.parasites)}
                      onCheckedChange={(v) => setEditingForm({ ...editingForm, parasites: !!v })}
                    />
                    <label className="text-sm">Parasites</label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Examination Date</label>
                <Input
                  type="date"
                  value={editingForm.examinationDate ? String(editingForm.examinationDate).split('T')[0] : ''}
                  onChange={(e) => setEditingForm({ ...editingForm, examinationDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Examined By</label>
                  <Input
                    value={editingForm.examinedBy || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, examinedBy: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Referral No.</label>
                  <Input
                    value={editingForm.referalNo || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, referalNo: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setEditDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update History Form'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
