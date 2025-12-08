import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePartnerSession } from '@/lib/auth/partner-auth';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const partner = await validatePartnerSession(token);

    if (!partner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if partner is already premium
    if (partner.isPremium) {
      return NextResponse.json(
        { error: 'You are already a premium partner' },
        { status: 400 }
      );
    }

    // Check if there's already a pending request
    const existingRequest = await prisma.premiumPartnershipRequest.findFirst({
      where: {
        partnerId: partner.id,
        status: 'pending',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending premium request' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const paymentMethod = formData.get('paymentMethod') as string;
    const paymentScreenshot = formData.get('paymentScreenshot') as File;

    if (!paymentMethod || !paymentScreenshot) {
      return NextResponse.json(
        { error: 'Payment method and screenshot are required' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await paymentScreenshot.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload screenshot to Cloudinary
    const uploadResult = await uploadImage(buffer, 'premium-requests', paymentScreenshot.name);

    // Create premium request
    const premiumRequest = await prisma.premiumPartnershipRequest.create({
      data: {
        partnerId: partner.id,
        paymentMethod,
        paymentScreenshot: uploadResult.secure_url,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Premium request submitted successfully',
      request: premiumRequest,
    });
  } catch (error) {
    console.error('Premium request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const partner = await validatePartnerSession(token);

    if (!partner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get partner's premium requests
    const requests = await prisma.premiumPartnershipRequest.findMany({
      where: {
        partnerId: partner.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get premium requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
