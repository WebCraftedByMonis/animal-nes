import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const stickyLogo = await prisma.stickyLogo.findFirst({
      where: { isActive: true },
      include: {
        company: {
          include: {
            image: true,
          },
        },
      },
    })

    if (!stickyLogo) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ data: stickyLogo })
  } catch (error) {
    console.error('Error fetching sticky logo:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sticky logo' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: parseInt(companyId) },
      include: { image: true },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Deactivate all existing sticky logos
    await prisma.stickyLogo.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Create or reactivate sticky logo for this company
    const existingStickyLogo = await prisma.stickyLogo.findFirst({
      where: { companyId: parseInt(companyId) },
    })

    let stickyLogo
    if (existingStickyLogo) {
      stickyLogo = await prisma.stickyLogo.update({
        where: { id: existingStickyLogo.id },
        data: { isActive: true },
        include: {
          company: {
            include: {
              image: true,
            },
          },
        },
      })
    } else {
      stickyLogo = await prisma.stickyLogo.create({
        data: {
          companyId: parseInt(companyId),
          isActive: true,
        },
        include: {
          company: {
            include: {
              image: true,
            },
          },
        },
      })
    }

    return NextResponse.json({ data: stickyLogo }, { status: 201 })
  } catch (error) {
    console.error('Error creating sticky logo:', error)
    return NextResponse.json(
      { error: 'Failed to create sticky logo' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    // Deactivate all sticky logos
    await prisma.stickyLogo.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    return NextResponse.json(
      { message: 'Sticky logo removed successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error removing sticky logo:', error)
    return NextResponse.json(
      { error: 'Failed to remove sticky logo' },
      { status: 500 }
    )
  }
}
