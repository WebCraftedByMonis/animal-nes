// app/api/master-trainer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { z } from 'zod';

// Validation schema
const registrationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  whatsappNumber: z.string().min(1, 'WhatsApp number is required'),
  address: z.string().min(1, 'Address is required'),
  paymentConfirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm the payment requirement'
  }),
});

// POST - Create new registration
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form fields
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const whatsappNumber = formData.get('whatsappNumber') as string;
    const address = formData.get('address') as string;
    const paymentConfirmed = formData.get('paymentConfirmed') === 'true';
    const screenshotFile = formData.get('screenshot') as File | null;

    // Validate required fields
    const validation = registrationSchema.safeParse({
      name,
      email,
      whatsappNumber,
      address,
      paymentConfirmed,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Screenshot is required
    if (!screenshotFile) {
      return NextResponse.json(
        { error: 'Payment screenshot is required' },
        { status: 400 }
      );
    }

    let screenshotUrl = null;
    let screenshotPublicId = null;

    // Upload screenshot to Cloudinary
    if (screenshotFile) {
      try {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(screenshotFile.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Only JPEG, JPG, PNG, and WEBP are allowed' },
            { status: 400 }
          );
        }

        // Validate file size (max 10MB)
        if (screenshotFile.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'File size must be less than 10MB' },
            { status: 400 }
          );
        }

        // Convert file to buffer
        const arrayBuffer = await screenshotFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const uploadResult = await uploadImage(
          buffer,
          'master-trainer-payments',
          `payment-${Date.now()}.${screenshotFile.name.split('.').pop()}`
        );

        screenshotUrl = uploadResult.secure_url;
        screenshotPublicId = uploadResult.public_id;

      } catch (uploadError) {
        console.error('Error uploading screenshot to Cloudinary:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload payment screenshot' },
          { status: 500 }
        );
      }
    }

    // Create registration record in database
    try {
      const registration = await prisma.masterTrainerRegistration.create({
        data: {
          name,
          email,
          whatsappNumber,
          address,
          paymentConfirmed,
          screenshotUrl,
          screenshotPublicId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Registration submitted successfully',
        registration,
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error:', dbError);

      // If database save failed but image was uploaded, delete it from Cloudinary
      if (screenshotPublicId) {
        try {
          const { deleteFromCloudinary } = await import('@/lib/cloudinary');
          await deleteFromCloudinary(screenshotPublicId, 'image');
        } catch (deleteError) {
          console.error('Failed to delete uploaded image after database error:', deleteError);
        }
      }

      return NextResponse.json(
        { error: 'Failed to save registration' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing registration:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET - Fetch all registrations
export async function GET(request: NextRequest) {
  try {
    const registrations = await prisma.masterTrainerRegistration.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(registrations);

  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a registration (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    const registrationId = parseInt(id);
    if (isNaN(registrationId)) {
      return NextResponse.json(
        { error: 'Invalid registration ID' },
        { status: 400 }
      );
    }

    // Find registration with screenshot details
    const registration = await prisma.masterTrainerRegistration.findUnique({
      where: { id: registrationId }
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary if screenshot exists
    if (registration.screenshotPublicId) {
      try {
        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
        await deleteFromCloudinary(registration.screenshotPublicId, 'image');
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    await prisma.masterTrainerRegistration.delete({
      where: { id: registrationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Registration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json(
      { error: 'Failed to delete registration' },
      { status: 500 }
    );
  }
}

// PATCH - Approve a registration and send email
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    const registrationId = parseInt(id);
    if (isNaN(registrationId)) {
      return NextResponse.json(
        { error: 'Invalid registration ID' },
        { status: 400 }
      );
    }

    // Find registration
    const registration = await prisma.masterTrainerRegistration.findUnique({
      where: { id: registrationId }
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Update registration to approved
    const updatedRegistration = await prisma.masterTrainerRegistration.update({
      where: { id: registrationId },
      data: { approved: true }
    });

    // Send approval email using existing email service
    try {
      const { sendMasterTrainerApproval } = await import('@/lib/email-service');
      await sendMasterTrainerApproval(registration);
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Registration approved and email sent successfully',
      registration: updatedRegistration
    });

  } catch (error) {
    console.error('Error approving registration:', error);
    return NextResponse.json(
      { error: 'Failed to approve registration' },
      { status: 500 }
    );
  }
}
