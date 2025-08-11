'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'

/** Zod validation schemas */
const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  strength: z.string().optional().nullable(),
  dosage: z.string().min(1, 'Dosage is required'),
  duration: z.string().min(1, 'Duration is required'),
  notes: z.string().optional().nullable(),
})

const prescriptionSchema = z.object({
  historyFormId: z.number().int().min(1, 'History Form ID is required'),
  doctorName: z.string().min(1, 'Doctor name is required'),
  qualification: z.string().optional().nullable(),
  prescriptionNo: z.string().optional().nullable(),
  clinicName: z.string().optional().nullable(),
  clinicAddress: z.string().optional().nullable(),
  clinicPhone: z.string().optional().nullable(),
  clinicEmail: z.string().optional().nullable(),
  // Auto-filled owner/animal but still included in payload
  ownerName: z.string().min(1, 'Owner name is required'),
  ownerContact: z.string().min(1, 'Owner contact is required'),
  animalSpecies: z.string().min(1, 'Animal species is required'),
  breed: z.string().optional().nullable(),
  age: z.string().optional().nullable(),
  sex: z.string().optional().nullable(),

  clinicalDiagnosis: z.string().optional().nullable(),
  labDiagnosis: z.string().optional().nullable(),

  continuePrevMedicine: z.boolean().optional(),
  followUpDate: z.string().optional().nullable(), // ISO string
  monitorSideEffects: z.boolean().optional(),
  maintainHygiene: z.boolean().optional(),

  prescriptionItems: z.array(prescriptionItemSchema).min(1, 'At least one prescription item is required'),
})

type FormValues = z.infer<typeof prescriptionSchema>

export default function NewPrescriptionPage() {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      historyFormId: undefined as unknown as number,
      doctorName: '',
      qualification: '',
      prescriptionNo: '',
      clinicName: '',
      clinicAddress: '',
      clinicPhone: '',
      clinicEmail: '',
      ownerName: '',
      ownerContact: '',
      animalSpecies: '',
      breed: '',
      age: '',
      sex: '',
      clinicalDiagnosis: '',
      labDiagnosis: '',
      continuePrevMedicine: false,
      followUpDate: null,
      monitorSideEffects: false,
      maintainHygiene: false,
      prescriptionItems: [{ medicineName: '', strength: '', dosage: '', duration: '', notes: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prescriptionItems',
  })

  const historyFormId = watch('historyFormId')

  const [loadingHistory, setLoadingHistory] = useState(false)

  // When the user enters a historyFormId, fetch that history form and auto-fill
  useEffect(() => {
    async function fetchHistory(id: number) {
      setLoadingHistory(true)
      try {
        const res = await fetch(`/api/history-forms/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            toast.error('History form not found')
            // clear owner/animal fields
            setValue('ownerName', '')
            setValue('ownerContact', '')
            setValue('animalSpecies', '')
            setValue('breed', '')
            setValue('age', '')
            setValue('sex', '')
            return
          }
          throw new Error('Failed to fetch history form')
        }
        const history = await res.json()
        // set owner & animal fields from history (names based on your HistoryForm model)
        setValue('ownerName', history.name ?? '')
        setValue('ownerContact', history.contact ?? '')
        setValue('animalSpecies', history.animalSpecie ?? '')
        setValue('breed', history.breed ?? '')
        setValue('age', history.age ?? '')
        setValue('sex', history.sex ?? '')
        toast.success('History form loaded — owner & animal fields filled')
      } catch (err: any) {
        console.error(err)
        toast.error(err?.message || 'Failed to load history form')
      } finally {
        setLoadingHistory(false)
      }
    }

    // only fetch when a positive integer is provided
    if (historyFormId && !Number.isNaN(Number(historyFormId))) {
      const idNum = Number(historyFormId)
      if (idNum > 0) fetchHistory(idNum)
    }
  }, [historyFormId, setValue])

  const onSubmit = async (data: FormValues) => {
    try {
      // ensure followUpDate is either null or ISO string
      const payload = {
        ...data,
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      }

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to create prescription')
      }

      toast.success('Prescription created successfully')
      // reset the form to defaults
      reset()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to create prescription')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-green-500">New Prescription</h1>
        <Link href="/dashboard/prescriptions">
          <Button variant="ghost">Back to Prescriptions</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Top row: Doctor, Qualification, Prescription No., Dated (use createdAt server-side) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Doctor</label>
            <Input {...register('doctorName')} placeholder="Doctor name" />
            {errors.doctorName && <p className="text-xs text-red-600 mt-1">{errors.doctorName.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Qualification</label>
            <Input {...register('qualification')} placeholder="Qualification (optional)" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Prescription No.</label>
            <Input {...register('prescriptionNo')} placeholder="Prescription number (optional)" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">History Form ID</label>
            <Input
              type="number"
              {...register('historyFormId', { valueAsNumber: true })}
              placeholder="Enter history form ID to auto-fill owner/animal"
            />
            {loadingHistory && <p className="text-xs text-gray-500 mt-1">Loading history...</p>}
            {errors.historyFormId && <p className="text-xs text-red-600 mt-1">{errors.historyFormId.message}</p>}
          </div>
        </div>

        {/* Clinic / Vet Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Clinic / Hospital</label>
            <Input {...register('clinicName')} placeholder="Clinic name (optional)" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Clinic Address</label>
            <Input {...register('clinicAddress')} placeholder="Clinic address (optional)" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Phone / WhatsApp</label>
            <Input {...register('clinicPhone')} placeholder="Clinic phone (optional)" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Email (optional)</label>
            <Input {...register('clinicEmail')} placeholder="Clinic email (optional)" />
          </div>
        </div>

        {/* Owner & Animal (auto-filled when id inserted) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Owner Name</label>
            <Input {...register('ownerName')} placeholder="Owner name (auto-filled from history)" />
            {errors.ownerName && <p className="text-xs text-red-600 mt-1">{errors.ownerName.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Owner Contact</label>
            <Input {...register('ownerContact')} placeholder="Owner contact (auto-filled)" />
            {errors.ownerContact && <p className="text-xs text-red-600 mt-1">{errors.ownerContact.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Animal Species</label>
            <Input {...register('animalSpecies')} placeholder="e.g., Cattle, Dog (auto-filled)" />
            {errors.animalSpecies && <p className="text-xs text-red-600 mt-1">{errors.animalSpecies.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Breed / Age / Sex</label>
            <div className="grid grid-cols-3 gap-2">
              <Input {...register('breed')} placeholder="Breed" />
              <Input {...register('age')} placeholder="Age" />
              <Input {...register('sex')} placeholder="Sex (M/F)" />
            </div>
          </div>
        </div>

        {/* Clinical / Lab */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Clinical Diagnosis / Findings</label>
            <Textarea {...register('clinicalDiagnosis')} placeholder="Clinical notes..." rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Lab Diagnosis / Test Results</label>
            <Textarea {...register('labDiagnosis')} placeholder="Lab results (optional)..." rows={3} />
          </div>
        </div>

        {/* Prescription Items (dynamic) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">Prescription</h2>
            <Button
              type="button"
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => append({ medicineName: '', strength: '', dosage: '', duration: '', notes: '' })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Medicine / Product Name</label>
                  <Input {...register(`prescriptionItems.${idx}.medicineName` as const)} placeholder="Medicine name" />
                  {errors.prescriptionItems?.[idx]?.medicineName && (
                    <p className="text-xs text-red-600 mt-1">{errors.prescriptionItems[idx]?.medicineName?.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">Strength</label>
                  <Input {...register(`prescriptionItems.${idx}.strength` as const)} placeholder="e.g., 500 mg" />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Dosage</label>
                  <Input {...register(`prescriptionItems.${idx}.dosage` as const)} placeholder="Dosage" />
                  {errors.prescriptionItems?.[idx]?.dosage && (
                    <p className="text-xs text-red-600 mt-1">{errors.prescriptionItems[idx]?.dosage?.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">Duration</label>
                  <Input {...register(`prescriptionItems.${idx}.duration` as const)} placeholder="e.g., 5 days" />
                  {errors.prescriptionItems?.[idx]?.duration && (
                    <p className="text-xs text-red-600 mt-1">{errors.prescriptionItems[idx]?.duration?.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">Notes</label>
                  <Input {...register(`prescriptionItems.${idx}.notes` as const)} placeholder="notes (optional)" />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(idx)}
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions to Owner */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">Instructions to Owner</label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Checkbox {...register('continuePrevMedicine')} />
              <label>Continue previous medicines as advised</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox {...register('monitorSideEffects')} />
              <label>Monitor for side effects</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox {...register('maintainHygiene')} />
              <label>Maintain hygiene and biosecurity</label>
            </div>
          </div>

          <div className="mt-2">
            <label className="text-sm font-medium">Follow-up on</label>
            <div className="flex items-center gap-3 mt-1">
              <Input type="date" {...register('followUpDate')} />
              <span className="text-sm text-gray-500"> — enter follow-up date (appears like: ☐ Follow-up on: DD / MM / YYYY)</span>
            </div>
          </div>
        </div>

        {/* Submit + Reset */}
        <div className="flex gap-3">
          <Button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Submit Prescription'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              reset({
                historyFormId: undefined as unknown as number,
                doctorName: '',
                qualification: '',
                prescriptionNo: '',
                clinicName: '',
                clinicAddress: '',
                clinicPhone: '',
                clinicEmail: '',
                ownerName: '',
                ownerContact: '',
                animalSpecies: '',
                breed: '',
                age: '',
                sex: '',
                clinicalDiagnosis: '',
                labDiagnosis: '',
                continuePrevMedicine: false,
                followUpDate: null,
                monitorSideEffects: false,
                maintainHygiene: false,
                prescriptionItems: [{ medicineName: '', strength: '', dosage: '', duration: '', notes: '' }],
              })
            }
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  )
}
