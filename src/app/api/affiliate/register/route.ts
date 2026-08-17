// Public affiliate sign-up. Always creates the affiliate in a PENDING state
// — an admin has to approve it from /dashboard/affiliate/partners before it
// can sign in and start generating links (same shape as
// /api/partner/register for vendors).
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateReferralCode } from '@/lib/auth/affiliate-auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  paymentMethod: z.string().optional(),
  bankName: z.string().optional(),
  accountTitle: z.string().optional(),
  accountNumber: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed } = await checkRateLimit(`affiliate-register:${ip}`, 5, 60 * 60);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many sign-up attempts from this device. Please try again in an hour.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { password, ...data } = validation.data;

    const existing = await prisma.affiliatePartner.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists. Please use a different email address.' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const referralCode = await generateReferralCode();

    const affiliate = await prisma.affiliatePartner.create({
      data: {
        ...data,
        password: hashedPassword,
        referralCode,
        status: 'PENDING',
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(
      {
        ...affiliate,
        message: 'Your affiliate account request has been submitted and is pending admin approval.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('POST /api/affiliate/register error:', error);

    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists. Please use a different email address.' },
        { status: 409 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to submit affiliate registration: ${errorMessage}` },
      { status: 500 }
    );
  }
}
