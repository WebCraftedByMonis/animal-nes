'use client'
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react'
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
import { useSearchParams } from 'next/navigation'

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
  appointmentId: z.number().int().optional(), // Optional since it comes from URL
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
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrescriptionFormContent />
    </Suspense>
  );
}


export  function PrescriptionFormContent() {
  const [loadingAppointment, setLoadingAppointment] = useState(false)
  const [historyFormError, setHistoryFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      historyFormId: undefined as unknown as number,
      appointmentId: undefined,
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

  // Fetch appointment data and auto-fill fields
// First, get historyFormId from URL params instead of appointmentId
const searchParams = useSearchParams();
const historyFormId = searchParams.get('historyFormId');

useEffect(() => {
  async function fetchHistoryData() {
    if (!historyFormId) {
      setHistoryFormError('No history form ID provided. Please complete the history form first.');
      return;
    }
    
    setLoadingAppointment(true);
    setHistoryFormError(null);
    
    try {
      // Directly fetch the history form by its ID
      const historyRes = await fetch(`/api/history-forms/${historyFormId}`);
      if (!historyRes.ok) {
        if (historyRes.status === 404) {
          setHistoryFormError('History form not found. Please complete the history form first.');
        } else {
          setHistoryFormError('Unable to load history form. Please try again.');
        }
        return;
      }
      
      const history = await historyRes.json();
      
      // Set the historyFormId
      setValue('historyFormId', parseInt(historyFormId));
      
      // Auto-fill from history form
      setValue('ownerName', history.name || '');
      setValue('ownerContact', history.contact || '');
      setValue('animalSpecies', history.animalSpecie || '');
      setValue('breed', history.breed || '');
      setValue('age', history.age || '');
      setValue('sex', history.sex || '');
      
      toast.success('History form data loaded successfully');
      
    } catch (err: any) {
      console.error(err);
      setHistoryFormError('Failed to load history data. Please try again.');
    } finally {
      setLoadingAppointment(false);
    }
  }
  
  fetchHistoryData();
}, [historyFormId, setValue]);

  const onSubmit = async (data: FormValues) => {
    // Prevent submission if there's a history form error
    if (historyFormError) {
      toast.error('Please complete the history form first before creating a prescription');
      return;
    }

    try {
      // Prepare payload with appointmentId and formatted date
      const payload = {
        ...data,
        historyFormId: historyFormId ? parseInt(historyFormId) : undefined,
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      }

      console.log('=== PRESCRIPTION FORM SUBMISSION DEBUG ===');
      console.log('Form data received:', data);
      console.log('History Form ID from URL:', historyFormId);
      console.log('Final payload being sent:', JSON.stringify(payload, null, 2));
      console.log('Payload keys:', Object.keys(payload));
      console.log('Prescription items count:', payload.prescriptionItems?.length || 0);
      console.log('First prescription item:', payload.prescriptionItems?.[0]);

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log('API Response status:', res.status);
      console.log('API Response ok:', res.ok);
      console.log('API Response headers:', Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('API Error response:', err);
        throw new Error(err?.error || 'Failed to create prescription')
      }

      const result = await res.json();
      console.log('Successful API response:', result);

      toast.success('Prescription created successfully')
      // Reset the form to defaults
      reset()
      
      // Optionally redirect back or to a success page
      // router.push('/dashboard/prescriptions');
      
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to create prescription')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-green-500">New Prescription</h1>
      
      </div>

      {/* Show error if history form is not available */}
      {historyFormError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-700 font-medium">⚠️ History Form Required</p>
          <p className="text-sm text-red-600 mt-1">{historyFormError}</p>
          <p className="text-sm text-red-600 mt-2">Please complete the history form before creating a prescription.</p>
        </div>
      )}

      {/* Show success when history form is loaded */}
      {historyFormId && !historyFormError && !loadingAppointment && (
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-700">
            ✅ Creating prescription for History Form ID: <strong>{historyFormId}</strong>
          </p>
        </div>
      )}

      {/* Loading state */}
      {historyFormId && loadingAppointment && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            📋 Loading history form data for ID: <strong>{historyFormId}</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">Please wait...</p>
        </div>
      )}

      {/* Only show form if no history form error */}
      {!historyFormError && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Top row: Doctor, Qualification, Prescription No. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Doctor *</label>
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
            <label className="text-sm font-medium text-gray-600">Email</label>
            <Input {...register('clinicEmail')} placeholder="Clinic email (optional)" />
          </div>
        </div>

        {/* Owner & Animal (auto-filled from appointment) */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Patient Information (Auto-filled from appointment)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Owner Name *</label>
              <Input {...register('ownerName')} placeholder="Owner name" />
              {errors.ownerName && <p className="text-xs text-red-600 mt-1">{errors.ownerName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Owner Contact *</label>
              <Input {...register('ownerContact')} placeholder="Owner contact" />
              {errors.ownerContact && <p className="text-xs text-red-600 mt-1">{errors.ownerContact.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Animal Species *</label>
              <Input {...register('animalSpecies')} placeholder="e.g., Cattle, Dog" />
              {errors.animalSpecies && <p className="text-xs text-red-600 mt-1">{errors.animalSpecies.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Breed / Age / Sex</label>
              <div className="grid grid-cols-3 gap-2">
                <Input {...register('breed')} placeholder="Breed" />
                <Input {...register('age')} placeholder="Age" />
                <Input {...register('sex')} placeholder="M/F" />
              </div>
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
                  <Input {...register(`prescriptionItems.${idx}.notes` as const)} placeholder="Notes (optional)" />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(idx)}
                    title="Remove item"
                    disabled={fields.length === 1}
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
              <label className="text-sm">Continue previous medicines as advised</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox {...register('monitorSideEffects')} />
              <label className="text-sm">Monitor for side effects</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox {...register('maintainHygiene')} />
              <label className="text-sm">Maintain hygiene and biosecurity</label>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">Follow-up Date</label>
            <div className="flex items-center gap-3 mt-1">
              <Input type="date" {...register('followUpDate')} className="max-w-xs" />
              <span className="text-sm text-gray-500">Schedule a follow-up appointment if needed</span>
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
                appointmentId: undefined,
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
      )}
    </div>
  )
}