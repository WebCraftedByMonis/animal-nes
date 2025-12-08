import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const partnerId = formData.get('partnerId');
    const paymentMethod = formData.get('paymentMethod') as string;
    const paymentScreenshot = formData.get('paymentScreenshot') as File;

    if (!partnerId || !paymentMethod || !paymentScreenshot) {
      return NextResponse.json(
        { error: 'Partner ID, payment method, and screenshot are required' },
        { status: 400 }
      );
    }

    // Verify partner exists
    const partner = await prisma.partner.findUnique({
      where: { id: parseInt(partnerId as string) },
    });

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Check if partner already has premium
    if (partner.isPremium) {
      return NextResponse.json(
        { error: 'Partner is already premium' },
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
        { error: 'A pending premium request already exists for this partner' },
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
      message: 'Premium request created successfully',
      request: premiumRequest,
    });
  } catch (error) {
    console.error('Create premium request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
