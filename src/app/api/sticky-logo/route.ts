import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country') || ''

    const stickyLogos = await prisma.stickyLogo.findMany({
      where: {
        isActive: true,
        ...(country && country !== 'all' ? { company: { country } } : {}),
      },
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
    const { companyId, country } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Check if we already have 10 active sticky logos
    const activeCount = await prisma.stickyLogo.count({
      where: {
        isActive: true,
        ...(country && country !== 'all' ? { company: { country } } : {}),
      },
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

    if (country && country !== 'all' && company.country !== country) {
      return NextResponse.json(
        { error: 'Company country does not match selected country' },
        { status: 400 }
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
      if (searchParams.get('country') && searchParams.get('country') !== 'all') {
        const country = searchParams.get('country') as string
        const logos = await prisma.stickyLogo.findMany({
          where: {
            isActive: true,
            company: { country },
          },
          select: { id: true },
        })
        const ids = logos.map(l => l.id)
        if (ids.length > 0) {
          await prisma.stickyLogo.updateMany({
            where: { id: { in: ids } },
            data: { isActive: false },
          })
        }
      } else {
        await prisma.stickyLogo.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        })
      }

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
