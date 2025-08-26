import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Zod schemas for validation
const historyFormSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Name is required'),
  contact: z.string().min(1, 'Contact is required'),
  address: z.string().min(1, 'Address is required'),
  animalSpecie: z.string().min(1, 'Animal species is required'),
  breed: z.string().min(1, 'Breed is required'),
  age: z.string().min(1, 'Age is required'),
  sex: z.string().min(1, 'Sex is required'),
  mainIssue: z.string().min(1, 'Main issue is required'),
  duration: z.string().min(1, 'Duration is required'),
  
  // Optional fields - allow null values
  tag: z.string().nullable().optional(),
  use: z.string().nullable().optional(),
  pastIllness: z.string().nullable().optional(),
  pastTreatment: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  surgeries: z.string().nullable().optional(),
  reproductiveStatus: z.string().nullable().optional(),
  lastEvent: z.string().nullable().optional(),
  diet: z.string().nullable().optional(),
  water: z.string().nullable().optional(),
  housing: z.string().nullable().optional(),
  milkPerDay: z.string().nullable().optional(),
  eggPerDay: z.string().nullable().optional(),
  weightGain: z.string().nullable().optional(),
  vaccinationDeworming: z.boolean().optional(),
  lastGiven: z.string().nullable().optional(),
  nextDue: z.string().nullable().optional(),
  newAnimalContact: z.boolean().optional(),
  transport: z.boolean().optional(),
  outbreakNearby: z.boolean().optional(),
  wildlife: z.boolean().optional(),
  parasites: z.boolean().optional(),
  examinedBy: z.string().nullable().optional(),
  examinationDate: z.string().nullable().optional(), // Will be converted to Date
  referalNo: z.string().nullable().optional(),
  appointmentId: z.number().nullable().optional(),
})

const updateHistoryFormSchema = historyFormSchema.partial()

// GET - Fetch all history forms
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
      prisma.historyForm.findMany({
        where: {
          OR: [
            { name: { contains: search } },
            { animalSpecie: { contains: search } },
            { breed: { contains: search } },
            { mainIssue: { contains: search } },
            { referalNo: { contains: search } },
          ],
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.historyForm.count({
        where: {
          OR: [
            { name: { contains: search } },
            { animalSpecie: { contains: search } },
            { breed: { contains: search } },
            { mainIssue: { contains: search } },
            { referalNo: { contains: search } },
          ],
        },
      }),
    ])

    return NextResponse.json({
      data: items,
      total,
    })
  } catch (error) {
    console.error('Error fetching history forms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history forms' },
      { status: 500 }
    )
  }
}

// POST - Create a new history form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== HISTORY FORM POST REQUEST DEBUG ===')
    console.log('Raw body received:', JSON.stringify(body, null, 2))
    console.log('Body keys:', Object.keys(body))
    console.log('Body values with types:', Object.entries(body).map(([key, value]) => ({
      key,
      value,
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      isEmpty: value === ''
    })))
    
    // Validate input
    const validation = historyFormSchema.safeParse(body)

    if (!validation.success) {
      console.log('=== VALIDATION FAILED ===')
      console.log('Validation errors:', JSON.stringify(validation.error.errors, null, 2))
      console.log('First error details:', validation.error.errors[0])
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.log('=== VALIDATION PASSED ===')
    console.log('Validated data:', JSON.stringify(validation.data, null, 2))

    // Convert examination date string to DateTime if provided
    const data = { ...validation.data }
    if (data.examinationDate) {
      data.examinationDate = new Date(data.examinationDate) as any
    }
const appointmentId = validation.data.appointmentId || null;
    
    // Check if history form already exists for this appointment
    if (appointmentId) {
      const existingForm = await prisma.historyForm.findUnique({
        where: { appointmentId: appointmentId }
      });

      if (existingForm) {
        return NextResponse.json(
          { error: 'History form already exists for this appointment' },
          { status: 400 }
        );
      }
    }

    // Create history form record
    const historyForm = await prisma.historyForm.create({
      data: {
        // Required fields
         appointmentId: appointmentId, 
        name: data.name,
        contact: data.contact,
        address: data.address,
        animalSpecie: data.animalSpecie,
        breed: data.breed,
        age: data.age,
        sex: data.sex,
        mainIssue: data.mainIssue,
        duration: data.duration,
        
        // Optional fields
        tag: data.tag || null,
        use: data.use || null,
        pastIllness: data.pastIllness || null,
        pastTreatment: data.pastTreatment || null,
        allergies: data.allergies || null,
        surgeries: data.surgeries || null,
        reproductiveStatus: data.reproductiveStatus || null,
        lastEvent: data.lastEvent || null,
        diet: data.diet || null,
        water: data.water || null,
        housing: data.housing || null,
        milkPerDay: data.milkPerDay || null,
        eggPerDay: data.eggPerDay || null,
        weightGain: data.weightGain || null,
        vaccinationDeworming: data.vaccinationDeworming || false,
        lastGiven: data.lastGiven || null,
        nextDue: data.nextDue || null,
        newAnimalContact: data.newAnimalContact || false,
        transport: data.transport || false,
        outbreakNearby: data.outbreakNearby || false,
        wildlife: data.wildlife || false,
        parasites: data.parasites || false,
        examinedBy: data.examinedBy || null,
        examinationDate: data.examinationDate || null,
        referalNo: data.referalNo || null,
      },
    })

    return NextResponse.json(historyForm, { status: 201 })
  } catch (error) {
    console.error('Error creating history form:', error)
    return NextResponse.json(
      { error: 'Failed to create history form' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a history form
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'History form ID is required' },
        { status: 400 }
      )
    }

    const historyFormId = parseInt(id)
    if (isNaN(historyFormId)) {
      return NextResponse.json(
        { error: 'Invalid history form ID' },
        { status: 400 }
      )
    }

    // Find the history form
    const historyForm = await prisma.historyForm.findUnique({
      where: { id: historyFormId },
    })

    if (!historyForm) {
      return NextResponse.json(
        { error: 'History form not found' },
        { status: 404 }
      )
    }

    // Delete the history form
    await prisma.historyForm.delete({
      where: { id: historyFormId },
    })

    return NextResponse.json(
      { message: 'History form deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting history form:', error)
    return NextResponse.json(
      { error: 'Failed to delete history form' },
      { status: 500 }
    )
  }
}

// PUT - Update a history form
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'History form ID is required' },
        { status: 400 }
      )
    }

    const historyFormId = parseInt(id)
    if (isNaN(historyFormId)) {
      return NextResponse.json(
        { error: 'Invalid history form ID' },
        { status: 400 }
      )
    }

    // Validate input if any field is provided
    const validation = updateHistoryFormSchema.safeParse(updateData)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Find the existing history form
    const existingHistoryForm = await prisma.historyForm.findUnique({
      where: { id: historyFormId },
    })

    if (!existingHistoryForm) {
      return NextResponse.json(
        { error: 'History form not found' },
        { status: 404 }
      )
    }

    // Convert examination date string to DateTime if provided
    const data = { ...validation.data }
    if (data.examinationDate) {
      data.examinationDate = new Date(data.examinationDate) as any
    }

    // Update the history form
    const updatedHistoryForm = await prisma.historyForm.update({
      where: { id: historyFormId },
      data: {
        // Update only provided fields
          // Add this
    
        name: data.name ?? existingHistoryForm.name,
        contact: data.contact ?? existingHistoryForm.contact,
        address: data.address ?? existingHistoryForm.address,
        animalSpecie: data.animalSpecie ?? existingHistoryForm.animalSpecie,
        breed: data.breed ?? existingHistoryForm.breed,
        age: data.age ?? existingHistoryForm.age,
        sex: data.sex ?? existingHistoryForm.sex,
        mainIssue: data.mainIssue ?? existingHistoryForm.mainIssue,
        duration: data.duration ?? existingHistoryForm.duration,
        tag: data.tag !== undefined ? data.tag : existingHistoryForm.tag,
        use: data.use !== undefined ? data.use : existingHistoryForm.use,
        pastIllness: data.pastIllness !== undefined ? data.pastIllness : existingHistoryForm.pastIllness,
        pastTreatment: data.pastTreatment !== undefined ? data.pastTreatment : existingHistoryForm.pastTreatment,
        allergies: data.allergies !== undefined ? data.allergies : existingHistoryForm.allergies,
        surgeries: data.surgeries !== undefined ? data.surgeries : existingHistoryForm.surgeries,
        reproductiveStatus: data.reproductiveStatus !== undefined ? data.reproductiveStatus : existingHistoryForm.reproductiveStatus,
        lastEvent: data.lastEvent !== undefined ? data.lastEvent : existingHistoryForm.lastEvent,
        diet: data.diet !== undefined ? data.diet : existingHistoryForm.diet,
        water: data.water !== undefined ? data.water : existingHistoryForm.water,
        housing: data.housing !== undefined ? data.housing : existingHistoryForm.housing,
        milkPerDay: data.milkPerDay !== undefined ? data.milkPerDay : existingHistoryForm.milkPerDay,
        eggPerDay: data.eggPerDay !== undefined ? data.eggPerDay : existingHistoryForm.eggPerDay,
        weightGain: data.weightGain !== undefined ? data.weightGain : existingHistoryForm.weightGain,
        vaccinationDeworming: data.vaccinationDeworming !== undefined ? data.vaccinationDeworming : existingHistoryForm.vaccinationDeworming,
        lastGiven: data.lastGiven !== undefined ? data.lastGiven : existingHistoryForm.lastGiven,
        nextDue: data.nextDue !== undefined ? data.nextDue : existingHistoryForm.nextDue,
        newAnimalContact: data.newAnimalContact !== undefined ? data.newAnimalContact : existingHistoryForm.newAnimalContact,
        transport: data.transport !== undefined ? data.transport : existingHistoryForm.transport,
        outbreakNearby: data.outbreakNearby !== undefined ? data.outbreakNearby : existingHistoryForm.outbreakNearby,
        wildlife: data.wildlife !== undefined ? data.wildlife : existingHistoryForm.wildlife,
        parasites: data.parasites !== undefined ? data.parasites : existingHistoryForm.parasites,
        examinedBy: data.examinedBy !== undefined ? data.examinedBy : existingHistoryForm.examinedBy,
        examinationDate: data.examinationDate !== undefined ? data.examinationDate : existingHistoryForm.examinationDate,
        referalNo: data.referalNo !== undefined ? data.referalNo : existingHistoryForm.referalNo,
      },
    })

    return NextResponse.json(updatedHistoryForm, { status: 200 })
  } catch (error) {
    console.error('Error updating history form:', error)
    return NextResponse.json(
      { error: 'Failed to update history form' },
      { status: 500 }
    )
  }
}

// GET single history form by ID
export async function GET_BY_ID(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  try {
    // Await the params object first
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const historyForm = await prisma.historyForm.findUnique({
      where: { id },
    });

    if (!historyForm) {
      return NextResponse.json({ error: 'History form not found' }, { status: 404 });
    }

    return NextResponse.json(historyForm);
  } catch (error) {
    console.error('Error fetching history form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history form' },
      { status: 500 }
    );
  }
}