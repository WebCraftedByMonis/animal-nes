import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60

// Validation schemas
const expenseSchema = z.object({
  category: z.enum(['PARTNER_DISTRIBUTION', 'PURCHASE_COST', 'OPERATING_EXPENSE', 'MARKETING', 'DELIVERY_COSTS', 'VET_FEES', 'OTHER']),
  amount: z.number().min(0),
  description: z.string().min(1),
  expenseDate: z.string().or(z.date()),
  paymentMethod: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  partnerId: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET - Fetch all expenses with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const partnerId = searchParams.get('partnerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = (page - 1) * limit

    const where: any = {
      OR: [
        { description: { contains: search } },
        { notes: { contains: search } },
      ],
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    if (partnerId) {
      where.partnerId = parseInt(partnerId)
    }

    if (startDate || endDate) {
      where.expenseDate = {}
      if (startDate) {
        where.expenseDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.expenseDate.lte = new Date(endDate)
      }
    }

    const [expenses, total, stats] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          paidToPartner: {
            select: {
              id: true,
              name: true,
              partnerType: true,
            },
          },
        },
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where: { status: 'COMPLETED' },
        _sum: {
          amount: true,
        },
      }),
    ])

    return NextResponse.json({
      data: expenses,
      total,
      page,
      limit,
      totalExpenses: stats._sum.amount || 0,
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

// POST - Create new expense (with optional receipt upload)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const category = formData.get('category') as string
    const amount = parseFloat(formData.get('amount') as string)
    const description = formData.get('description') as string
    const expenseDate = formData.get('expenseDate') as string
    const paymentMethod = formData.get('paymentMethod') as string | null
    const status = (formData.get('status') as string) || 'PENDING'
    const partnerId = formData.get('partnerId') ? parseInt(formData.get('partnerId') as string) : null
    const notes = formData.get('notes') as string | null
    const receiptFile = formData.get('receipt') as File | null

    const validation = expenseSchema.safeParse({
      category,
      amount,
      description,
      expenseDate,
      paymentMethod,
      status,
      partnerId,
      notes,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    let receiptUrl = null
    let receiptPublicId = null

    // Upload receipt if provided
    if (receiptFile) {
      const arrayBuffer = await receiptFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const uploadResult = await uploadImage(buffer, 'expenses/receipts', receiptFile.name)
      receiptUrl = uploadResult.secure_url
      receiptPublicId = uploadResult.public_id
    }

    const expense = await prisma.expense.create({
      data: {
        ...validation.data,
        expenseDate: new Date(validation.data.expenseDate),
        receiptUrl,
        receiptPublicId,
      },
      include: {
        paidToPartner: true,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}

// PUT - Update expense
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const id = parseInt(formData.get('id') as string)

    if (!id) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      )
    }

    const category = formData.get('category') as string | null
    const amount = formData.get('amount') ? parseFloat(formData.get('amount') as string) : null
    const description = formData.get('description') as string | null
    const expenseDate = formData.get('expenseDate') as string | null
    const paymentMethod = formData.get('paymentMethod') as string | null
    const status = formData.get('status') as string | null
    const partnerId = formData.get('partnerId') ? parseInt(formData.get('partnerId') as string) : null
    const notes = formData.get('notes') as string | null
    const receiptFile = formData.get('receipt') as File | null

    const updateData: any = {}
    if (category) updateData.category = category
    if (amount) updateData.amount = amount
    if (description) updateData.description = description
    if (expenseDate) updateData.expenseDate = new Date(expenseDate)
    if (paymentMethod) updateData.paymentMethod = paymentMethod
    if (status) updateData.status = status
    if (partnerId) updateData.partnerId = partnerId
    if (notes) updateData.notes = notes

    // Handle receipt update
    if (receiptFile) {
      const existingExpense = await prisma.expense.findUnique({
        where: { id },
        select: { receiptPublicId: true },
      })

      // Delete old receipt from Cloudinary
      if (existingExpense?.receiptPublicId) {
        try {
          await deleteFromCloudinary(existingExpense.receiptPublicId, 'image')
        } catch (error) {
          console.error('Error deleting old receipt:', error)
        }
      }

      // Upload new receipt
      const arrayBuffer = await receiptFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const uploadResult = await uploadImage(buffer, 'expenses/receipts', receiptFile.name)
      updateData.receiptUrl = uploadResult.secure_url
      updateData.receiptPublicId = uploadResult.public_id
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        paidToPartner: true,
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      )
    }

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) },
      select: { receiptPublicId: true },
    })

    // Delete receipt from Cloudinary if exists
    if (expense?.receiptPublicId) {
      try {
        await deleteFromCloudinary(expense.receiptPublicId, 'image')
      } catch (error) {
        console.error('Error deleting receipt from Cloudinary:', error)
      }
    }

    await prisma.expense.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json(
      { message: 'Expense deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}
