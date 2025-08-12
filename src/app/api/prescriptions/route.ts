import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Zod schema for prescription form
const prescriptionFormSchema = z.object({
  historyFormId: z.number().int().min(1, 'History form ID is required'),

  // Doctor/Vet Information
  doctorName: z.string().min(1, 'Doctor name is required'),
  qualification: z.string().optional(),
  clinicName: z.string().optional(),
  clinicAddress: z.string().optional(),
  clinicPhone: z.string().optional(),
  clinicEmail: z.string().optional(),

  // Clinical Information
  clinicalDiagnosis: z.string().optional(),
  labDiagnosis: z.string().optional(),

  // Instructions
  continuePrevMedicine: z.boolean().optional(),
  followUpDate: z.string().optional(),
  monitorSideEffects: z.boolean().optional(),
  maintainHygiene: z.boolean().optional(),

  // Prescription Items
  prescriptionItems: z
    .array(
      z.object({
        medicineName: z.string().min(1, 'Medicine name is required'),
        strength: z.string().optional(),
        dosage: z.string().min(1, 'Dosage is required'),
        duration: z.string().min(1, 'Duration is required'),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one prescription item is required'),
})

const updatePrescriptionFormSchema = prescriptionFormSchema.partial()

// GET - Fetch all prescriptions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'id'
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'
    const limitParam = searchParams.get('limit') || '10'

    const limit = limitParam === 'all' ? undefined : parseInt(limitParam, 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = limit ? (page - 1) * limit : undefined

    const [items, total] = await Promise.all([
      prisma.prescriptionForm.findMany({
        where: {
          OR: [
            { ownerName: { contains: search } },
            { animalSpecies: { contains: search } },
            { breed: { contains: search } },
            { clinicalDiagnosis: { contains: search } },
            { doctorName: { contains: search } },
          ],
        },
        include: {
          prescriptionItems: true,
          historyForm: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.prescriptionForm.count({
        where: {
          OR: [
            { ownerName: { contains: search } },
            { animalSpecies: { contains: search } },
            { breed: { contains: search } },
            { clinicalDiagnosis: { contains: search } },
            { doctorName: { contains: search } },
          ],
        },
      }),
    ])

    return NextResponse.json({ data: items, total })
  } catch (error) {
    console.error('Error fetching prescriptions:', error)
    return NextResponse.json({ error: 'Failed to fetch prescriptions' }, { status: 500 })
  }
}

// POST - Create prescription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = prescriptionFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = { ...validation.data }

    // Fetch related history form for owner/animal info
    const history = await prisma.historyForm.findUnique({
      where: { id: data.historyFormId },
    })

    if (!history) {
      return NextResponse.json({ error: 'Related history form not found' }, { status: 404 })
    }

    const prescription = await prisma.prescriptionForm.create({
      data: {
        historyFormId: data.historyFormId,
        doctorName: data.doctorName,
        qualification: data.qualification || null,
        clinicName: data.clinicName || null,
        clinicAddress: data.clinicAddress || null,
        clinicPhone: data.clinicPhone || null,
        clinicEmail: data.clinicEmail || null,

        // Auto-fill from history form
        ownerName: history.name,
        ownerContact: history.contact,
        animalSpecies: history.animalSpecie,
        breed: history.breed,
        age: history.age,
        sex: history.sex,

        clinicalDiagnosis: data.clinicalDiagnosis || null,
        labDiagnosis: data.labDiagnosis || null,

        continuePrevMedicine: data.continuePrevMedicine || false,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        monitorSideEffects: data.monitorSideEffects || false,
        maintainHygiene: data.maintainHygiene || false,

        prescriptionItems: {
          create: data.prescriptionItems.map(item => ({
            medicineName: item.medicineName,
            strength: item.strength || null,
            dosage: item.dosage,
            duration: item.duration,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        prescriptionItems: true,
        historyForm: true,
      },
    })

    return NextResponse.json(prescription, { status: 201 })
  } catch (error) {
    console.error('Error creating prescription:', error)
    return NextResponse.json({ error: 'Failed to create prescription' }, { status: 500 })
  }
}

// DELETE - Delete prescription
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 })
    }

    const prescriptionId = parseInt(id)
    if (isNaN(prescriptionId)) {
      return NextResponse.json({ error: 'Invalid prescription ID' }, { status: 400 })
    }

    const prescription = await prisma.prescriptionForm.findUnique({
      where: { id: prescriptionId },
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    await prisma.prescriptionForm.delete({
      where: { id: prescriptionId },
    })

    return NextResponse.json({ message: 'Prescription deleted successfully' })
  } catch (error) {
    console.error('Error deleting prescription:', error)
    return NextResponse.json({ error: 'Failed to delete prescription' }, { status: 500 })
  }
}
// PUT - Update prescription
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('PUT /api/prescriptions body:', body)

    const { id, ...updateData } = body

    if (id === undefined || id === null) {
      return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 })
    }

    const prescriptionId = Number(id)
    if (!Number.isInteger(prescriptionId)) {
      return NextResponse.json({ error: 'Invalid prescription ID' }, { status: 400 })
    }

    // --- sanitizer: whitelist and convert null -> undefined for optional fields ---
    function sanitizeUpdatePayload(raw: any) {
      if (!raw || typeof raw !== 'object') return {}

      const allowedTop = [
        'doctorName','qualification','clinicName','clinicAddress','clinicPhone','clinicEmail',
        'clinicalDiagnosis','labDiagnosis','continuePrevMedicine','followUpDate',
        'monitorSideEffects','maintainHygiene','prescriptionItems'
      ]

      const cleaned: any = {}

      for (const key of allowedTop) {
        if (!(key in raw)) continue
        const val = raw[key]

        // convert explicit null -> undefined so zod optional() will accept it
        if (val === null) {
          cleaned[key] = undefined
          continue
        }

        // normalize followUpDate: empty string -> undefined
        if (key === 'followUpDate') {
          if (val === '' || val === undefined) cleaned.followUpDate = undefined
          else cleaned.followUpDate = val
          continue
        }

        cleaned[key] = val
      }

      // prescriptionItems: ensure array of allowed shape and strip extra props
      if (Array.isArray(raw.prescriptionItems)) {
        cleaned.prescriptionItems = raw.prescriptionItems.map((it: any) => ({
          medicineName: it?.medicineName,
          strength: it?.strength ?? undefined,
          dosage: it?.dosage,
          duration: it?.duration,
          notes: it?.notes ?? undefined,
        }))
      }

      return cleaned
    }

    const sanitized = sanitizeUpdatePayload(updateData)

    // validate with zod
    const validation = updatePrescriptionFormSchema.safeParse(sanitized)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const existingPrescription = await prisma.prescriptionForm.findUnique({
      where: { id: prescriptionId },
    })

    if (!existingPrescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    const data = { ...validation.data }

    // Update prescription items separately if provided
    let prescriptionItemsUpdate
    if (data.prescriptionItems) {
      // delete old items
      await prisma.prescriptionItem.deleteMany({
        where: { prescriptionId },
      })

      // prepare create payload (convert undefined -> null for nullable DB columns)
      prescriptionItemsUpdate = {
        create: data.prescriptionItems.map((item: any) => ({
          medicineName: item.medicineName,
          // keep null if falsy so DB nullable columns get null; adjust as per your preference
          strength: item.strength || null,
          dosage: item.dosage,
          duration: item.duration,
          notes: item.notes || null,
        })),
      }
    }

    const updatedPrescription = await prisma.prescriptionForm.update({
      where: { id: prescriptionId },
      data: {
        doctorName: data.doctorName ?? existingPrescription.doctorName,
        qualification: data.qualification ?? existingPrescription.qualification,
        clinicName: data.clinicName ?? existingPrescription.clinicName,
        clinicAddress: data.clinicAddress ?? existingPrescription.clinicAddress,
        clinicPhone: data.clinicPhone ?? existingPrescription.clinicPhone,
        clinicEmail: data.clinicEmail ?? existingPrescription.clinicEmail,
        clinicalDiagnosis: data.clinicalDiagnosis ?? existingPrescription.clinicalDiagnosis,
        labDiagnosis: data.labDiagnosis ?? existingPrescription.labDiagnosis,
        continuePrevMedicine: data.continuePrevMedicine ?? existingPrescription.continuePrevMedicine,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : existingPrescription.followUpDate,
        monitorSideEffects: data.monitorSideEffects ?? existingPrescription.monitorSideEffects,
        maintainHygiene: data.maintainHygiene ?? existingPrescription.maintainHygiene,
        ...(prescriptionItemsUpdate && { prescriptionItems: prescriptionItemsUpdate }),
      },
      include: {
        prescriptionItems: true,
      },
    })

    return NextResponse.json(updatedPrescription)
  } catch (error) {
    console.error('Error updating prescription:', error)
    return NextResponse.json({ error: 'Failed to update prescription' }, { status: 500 })
  }
}
