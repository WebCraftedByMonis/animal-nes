import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'// adjust this import if your authOptions are elsewhere
import { prisma } from '@/lib/prisma'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

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
