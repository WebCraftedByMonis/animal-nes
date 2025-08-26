import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appointments = await prisma.appointmentRequest.findMany({
      where: {
        customer: {
          email: session.user.email,
        },
      },
      orderBy: {
        appointmentAt: 'desc',
      },
    })

    return NextResponse.json({ data: appointments }, { status: 200 })
  } catch (error) {
    console.error('Error fetching user appointments:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
