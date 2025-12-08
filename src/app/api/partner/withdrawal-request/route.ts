import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePartnerSession } from '@/lib/auth/partner-auth';

export async function POST(request: NextRequest) {
  try {
    // Get partner from session
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const partner = await validatePartnerSession(token);

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const { amount, accountTitle, accountNumber, bankName, paymentMethod } = await request.json();

    // Validation
    if (!amount || !accountTitle || !accountNumber || !bankName || !paymentMethod) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if partner has sufficient balance
    if (partner.walletBalance < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    // Check for pending withdrawal requests
    const pendingRequest = await prisma.withdrawalRequest.findFirst({
      where: {
        partnerId: partner.id,
        status: 'pending'
      }
    });

    if (pendingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending withdrawal request' },
        { status: 400 }
      );
    }

    // Create withdrawal request
    const withdrawalRequest = await prisma.withdrawalRequest.create({
      data: {
        partnerId: partner.id,
        amount,
        accountTitle,
        accountNumber,
        bankName,
        paymentMethod,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      request: withdrawalRequest,
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch partner's withdrawal requests
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const partner = await validatePartnerSession(token);

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const requests = await prisma.withdrawalRequest.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
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
