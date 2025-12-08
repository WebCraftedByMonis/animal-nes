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

    // Check if partner already has a referral code
    if (partner.referralCode) {
      return NextResponse.json({
        error: 'You already have a referral code',
        referralCode: partner.referralCode
      }, { status: 400 });
    }

    // Generate unique referral code
    const generateReferralCode = () => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return code;
    };

    let newReferralCode = generateReferralCode();
    let codeExists = await prisma.partner.findUnique({
      where: { referralCode: newReferralCode }
    });

    while (codeExists) {
      newReferralCode = generateReferralCode();
      codeExists = await prisma.partner.findUnique({
        where: { referralCode: newReferralCode }
      });
    }

    // Update partner with new referral code
    const updatedPartner = await prisma.partner.update({
      where: { id: partner.id },
      data: { referralCode: newReferralCode },
    });

    return NextResponse.json({
      success: true,
      referralCode: updatedPartner.referralCode,
      message: 'Referral code generated successfully',
    });
  } catch (error) {
    console.error('Generate referral code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
