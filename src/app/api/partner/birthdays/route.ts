import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get today's date
    const today = new Date()
    const todayMonth = today.getMonth() + 1 // getMonth() is 0-indexed
    const todayDay = today.getDate()

    // Get all partners with birthday information
    const allPartners = await prisma.partner.findMany({
      where: {
        areaTown: {
          not: null
        }
      },
      select: {
        id: true,
        partnerName: true,
        partnerMobileNumber: true,
        cityName: true,
        areaTown: true,
        partnerType: true,
        partnerImage: {
          select: {
            url: true,
            publicId: true
          }
        }
      }
    })

    // Filter partners who have birthdays today
    const birthdayPartners = allPartners.filter(partner => {
      if (!partner.areaTown) return false

      try {
        // Try to parse different date formats
        let birthDate: Date | null = null

        // Try YYYY-MM-DD format
        if (partner.areaTown.match(/^\d{4}-\d{2}-\d{2}$/)) {
          birthDate = new Date(partner.areaTown)
        }
        // Try DD/MM/YYYY format
        else if (partner.areaTown.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const parts = partner.areaTown.split('/')
          // Assume DD/MM/YYYY format
          birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
        }
        // Try MM/DD/YYYY format
        else if (partner.areaTown.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
          const parts = partner.areaTown.split('-')
          birthDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
        }
        // Try parsing as-is
        else {
          birthDate = new Date(partner.areaTown)
        }

        if (!birthDate || isNaN(birthDate.getTime())) {
          return false
        }

        // Check if birth month and day match today's month and day
        const birthMonth = birthDate.getMonth() + 1
        const birthDay = birthDate.getDate()

        return birthMonth === todayMonth && birthDay === todayDay

      } catch (error) {
        console.error(`Error parsing birthday for partner ${partner.id}:`, error)
        return false
      }
    })

    return NextResponse.json({
      success: true,
      partners: birthdayPartners,
      total: birthdayPartners.length,
      date: today.toISOString().split('T')[0]
    })

  } catch (error) {
    console.error('Error fetching birthday partners:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch birthday partners',
        partners: [],
        total: 0
      },
      { status: 500 }
    )
  }
}