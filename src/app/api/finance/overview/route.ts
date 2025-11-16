import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET - Fetch financial overview statistics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Get total revenue (completed transactions)
    const revenueStats = await prisma.transaction.aggregate({
      where: {
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // Get revenue by type
    const revenueByType = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // Get total expenses (completed)
    const expenseStats = await prisma.expense.aggregate({
      where: {
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 && { expenseDate: dateFilter }),
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // Get expenses by category
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 && { expenseDate: dateFilter }),
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // Get pending distributions
    const pendingDistributions = await prisma.partnerDistribution.aggregate({
      where: {
        status: 'PENDING',
      },
      _sum: {
        shareAmount: true,
      },
      _count: true,
    })

    // Get active partners count
    const activePartnersCount = await prisma.businessPartner.count({
      where: { isActive: true },
    })

    // Calculate net profit
    const totalRevenue = revenueStats._sum.amount || 0
    const totalExpenses = expenseStats._sum.amount || 0
    const netProfit = totalRevenue - totalExpenses

    // Get monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyRevenue = await prisma.$queryRaw`
      SELECT
        DATE_FORMAT(transactionDate, '%Y-%m') as month,
        SUM(amount) as revenue
      FROM Transaction
      WHERE status = 'COMPLETED' AND transactionDate >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(transactionDate, '%Y-%m')
      ORDER BY month ASC
    `

    const monthlyExpenses = await prisma.$queryRaw`
      SELECT
        DATE_FORMAT(expenseDate, '%Y-%m') as month,
        SUM(amount) as expense
      FROM Expense
      WHERE status = 'COMPLETED' AND expenseDate >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(expenseDate, '%Y-%m')
      ORDER BY month ASC
    `

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
        transactionCount: revenueStats._count,
        expenseCount: expenseStats._count,
        pendingDistributions: pendingDistributions._sum.shareAmount || 0,
        pendingDistributionsCount: pendingDistributions._count,
        activePartnersCount,
      },
      revenueByType: revenueByType.map((item) => ({
        type: item.type,
        amount: item._sum.amount || 0,
        count: item._count,
      })),
      expensesByCategory: expensesByCategory.map((item) => ({
        category: item.category,
        amount: item._sum.amount || 0,
        count: item._count,
      })),
      monthlyTrend: {
        revenue: monthlyRevenue,
        expenses: monthlyExpenses,
      },
    })
  } catch (error) {
    console.error('Error fetching financial overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial overview' },
      { status: 500 }
    )
  }
}
