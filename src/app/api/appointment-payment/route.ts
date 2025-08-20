// app/api/appointment-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFileToCloudinary } from '@/lib/cloudinary'; // Your existing cloudinary utility
import { z } from 'zod';

// Validation schema
const paymentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  consultationType: z.enum(['needy', 'virtual', 'physical']),
  consultationFee: z.string().transform(val => parseFloat(val)),
  paymentMethod: z.enum(['jazzcash', 'easypaisa', 'bank', 'cod']),
});

// POST - Create appointment payment record
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form fields
    const appointmentId = formData.get('appointmentId') as string;
    const consultationType = formData.get('consultationType') as string;
    const consultationFee = formData.get('consultationFee') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const screenshotFile = formData.get('screenshot') as File | null;
    
    // Validate required fields
    const validation = paymentSchema.safeParse({
      appointmentId,
      consultationType,
      consultationFee,
      paymentMethod,
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    // Parse appointment ID
    const appointmentIdNum = parseInt(appointmentId);
    if (isNaN(appointmentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }
    
    // Check if appointment exists
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id: appointmentIdNum },
      include: { paymentInfo: true }
    });
    
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }
    
    // Check if payment already exists for this appointment
    if (appointment.paymentInfo) {
      return NextResponse.json(
        { error: 'Payment information already exists for this appointment' },
        { status: 409 }
      );
    }
    
    // Screenshot required for all payment methods except COD
    if (paymentMethod !== 'cod' && !screenshotFile) {
      return NextResponse.json(
        { error: 'Payment screenshot is required for online payment methods' },
        { status: 400 }
      );
    }
    
    let screenshotUrl = null;
    let screenshotPublicId = null;
    
    // Upload screenshot to Cloudinary if provided
    if (screenshotFile && paymentMethod !== 'cod') {
      try {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(screenshotFile.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Only JPEG, JPG, PNG, and WEBP are allowed' },
            { status: 400 }
          );
        }
        
        // Validate file size (max 5MB)
        if (screenshotFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'File size must be less than 5MB' },
            { status: 400 }
          );
        }
        
        // Convert file to buffer
        const arrayBuffer = await screenshotFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Upload to Cloudinary with specific folder for payment screenshots
        const uploadResult = await uploadFileToCloudinary(
          buffer,
          'appointment-payments', // Folder name in Cloudinary
          'image',
          `payment-${appointmentIdNum}-${Date.now()}.${screenshotFile.name.split('.').pop()}`
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
    
    // Create payment record in database
    try {
      const paymentInfo = await prisma.paymentInfo.create({
        data: {
          appointmentId: appointmentIdNum,
          consultationType: validation.data.consultationType,
          consultationFee: validation.data.consultationFee,
          paymentMethod: validation.data.paymentMethod,
          screenshotUrl,
          screenshotPublicId,
        },
        include: {
          appointment: {
            include: {
              customer: true
            }
          }
        }
      });
      
      // TODO: Trigger WhatsApp notification to doctors here
      // This will be implemented in the WhatsApp integration phase
      // For now, just log it
      console.log('Payment submitted for appointment:', appointmentIdNum);
      console.log('Need to notify doctors in city:', appointment.city);
      
      return NextResponse.json({
        success: true,
        message: 'Payment information submitted successfully',
        paymentInfo,
      }, { status: 201 });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If database save failed but image was uploaded, try to delete it from Cloudinary
      if (screenshotPublicId) {
        try {
          const { deleteFromCloudinary } = await import('@/lib/cloudinary');
          await deleteFromCloudinary(screenshotPublicId, 'image');
        } catch (deleteError) {
          console.error('Failed to delete uploaded image after database error:', deleteError);
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to save payment information' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET - Fetch payment info for an appointment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }
    
    const appointmentIdNum = parseInt(appointmentId);
    if (isNaN(appointmentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }
    
    const paymentInfo = await prisma.paymentInfo.findUnique({
      where: { appointmentId: appointmentIdNum },
      include: {
        appointment: {
          include: {
            customer: true
          }
        }
      }
    });
    
    if (!paymentInfo) {
      return NextResponse.json(
        { error: 'Payment information not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(paymentInfo);
    
  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment information' },
      { status: 500 }
    );
  }
}

// DELETE - Delete payment info (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }
    
    const paymentIdNum = parseInt(paymentId);
    if (isNaN(paymentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
    }
    
    // Find payment info with screenshot details
    const paymentInfo = await prisma.paymentInfo.findUnique({
      where: { id: paymentIdNum }
    });
    
    if (!paymentInfo) {
      return NextResponse.json(
        { error: 'Payment information not found' },
        { status: 404 }
      );
    }
    
    // Delete from Cloudinary if screenshot exists
    if (paymentInfo.screenshotPublicId) {
      try {
        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
        await deleteFromCloudinary(paymentInfo.screenshotPublicId, 'image');
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete from database
    await prisma.paymentInfo.delete({
      where: { id: paymentIdNum }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Payment information deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting payment info:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment information' },
      { status: 500 }
    );
  }
}