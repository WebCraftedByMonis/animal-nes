import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validatePartnerSession } from '@/lib/auth/partner-auth'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('partner-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const partner = await validatePartnerSession(token)
    if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const companyId = parseInt(searchParams.get('companyId') || '')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const settings = await prisma.companyPaymentSettings.findUnique({
      where: { companyId },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
