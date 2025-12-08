import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all withdrawal requests
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';

    const where: any = {};
    if (status !== 'all') {
      where.status = status;
    }

    const requests = await prisma.withdrawalRequest.findMany({
      where,
      include: {
        partner: {
          select: {
            id: true,
            partnerName: true,
            partnerEmail: true,
            shopName: true,
            partnerMobileNumber: true,
            walletBalance: true,
            isPremium: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Approve or reject withdrawal request
export async function PUT(request: NextRequest) {
  try {
    const { requestId, action, notes } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      );
    }

    const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { partner: true },
    });

    if (!withdrawalRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (withdrawalRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      );
    }

    // Update request status
    const updatedRequest = await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        notes: notes || null,
      },
    });

    // If approved, deduct from partner's wallet
    if (action === 'approve') {
      await prisma.partner.update({
        where: { id: withdrawalRequest.partnerId },
        data: {
          walletBalance: {
            decrement: withdrawalRequest.amount
          }
        }
      });

      // Record as expense in finance system
      await prisma.expense.create({
        data: {
          category: 'PARTNER_DISTRIBUTION',
          amount: withdrawalRequest.amount,
          description: `Withdrawal to ${withdrawalRequest.partner.partnerName} - ${withdrawalRequest.paymentMethod}`,
          expenseDate: new Date(),
          paymentMethod: withdrawalRequest.paymentMethod,
          status: 'COMPLETED',
          notes: `Account: ${withdrawalRequest.accountNumber} (${withdrawalRequest.accountTitle}) - Bank: ${withdrawalRequest.bankName}. Request #${requestId}`,
        },
      });

      console.log(`✅ Deducted ${withdrawalRequest.amount} PKR from ${withdrawalRequest.partner.partnerName}'s wallet`);
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action}d successfully`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Update withdrawal request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
