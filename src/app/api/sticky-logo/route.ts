import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const stickyLogos = await prisma.stickyLogo.findMany({
      where: { isActive: true },
      include: {
        company: {
          include: {
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 10, // Limit to 10 logos
    })

    return NextResponse.json({ data: stickyLogos })
  } catch (error) {
    console.error('Error fetching sticky logos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sticky logos' },
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

    // Check if we already have 10 active sticky logos
    const activeCount = await prisma.stickyLogo.count({
      where: { isActive: true },
    })

    if (activeCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum of 10 sticky logos reached. Please remove one before adding a new one.' },
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

    // Check if this company already has an active sticky logo
    const existingActiveLogo = await prisma.stickyLogo.findFirst({
      where: {
        companyId: parseInt(companyId),
        isActive: true
      },
    })

    if (existingActiveLogo) {
      return NextResponse.json(
        { error: 'This company already has an active sticky logo' },
        { status: 400 }
      )
    }

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Delete specific sticky logo
      await prisma.stickyLogo.update({
        where: { id: parseInt(id) },
        data: { isActive: false },
      })

      return NextResponse.json(
        { message: 'Sticky logo removed successfully' },
        { status: 200 }
      )
    } else {
      // Deactivate all sticky logos
      await prisma.stickyLogo.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })

      return NextResponse.json(
        { message: 'All sticky logos removed successfully' },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Error removing sticky logo:', error)
    return NextResponse.json(
      { error: 'Failed to remove sticky logo' },
      { status: 500 }
    )
  }
}
