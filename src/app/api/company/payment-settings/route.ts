import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validateCompanySession } from '@/lib/auth/company-auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('company-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await validateCompanySession(token)
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = await prisma.companyPaymentSettings.findUnique({
      where: { companyId: company.id }
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('company-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await validateCompanySession(token)
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      bankName,
      accountTitle,
      accountNumber,
      jazzcashNumber,
      easypaisaNumber,
      enableCOD,
      enableBank,
      enableJazzcash,
      enableEasypaisa,
      minimumOrderAmount,
      policyText,
    } = body

    const settings = await prisma.companyPaymentSettings.upsert({
      where: { companyId: company.id },
      update: {
        bankName: bankName || null,
        accountTitle: accountTitle || null,
        accountNumber: accountNumber || null,
        jazzcashNumber: jazzcashNumber || null,
        easypaisaNumber: easypaisaNumber || null,
        enableCOD: !!enableCOD,
        enableBank: !!enableBank,
        enableJazzcash: !!enableJazzcash,
        enableEasypaisa: !!enableEasypaisa,
        minimumOrderAmount: minimumOrderAmount ? parseFloat(minimumOrderAmount) : 0,
        policyText: policyText || null,
      },
      create: {
        companyId: company.id,
        bankName: bankName || null,
        accountTitle: accountTitle || null,
        accountNumber: accountNumber || null,
        jazzcashNumber: jazzcashNumber || null,
        easypaisaNumber: easypaisaNumber || null,
        enableCOD: !!enableCOD,
        enableBank: !!enableBank,
        enableJazzcash: !!enableJazzcash,
        enableEasypaisa: !!enableEasypaisa,
        minimumOrderAmount: minimumOrderAmount ? parseFloat(minimumOrderAmount) : 0,
        policyText: policyText || null,
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error updating payment settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
