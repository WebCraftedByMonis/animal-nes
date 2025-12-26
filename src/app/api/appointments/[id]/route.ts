import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const forHistoryForm = searchParams.get('forHistoryForm') === 'true';
  
  // Allow access for history form creation without authentication
  if (!session?.user?.email && !forHistoryForm) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  
  // Await the params object first
  const { id } = await params;
  
  try {
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id: parseInt(id) }, // Use the awaited id
      include: {
        customer: true,
      },
    });

    if (!appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), { status: 404 });
    }

    // Normalize customer data for consistency
    const normalizedAppointment = {
      ...appointment,
      customer: appointment.customer ? {
        ...appointment.customer,
        contact: appointment.customer.PhoneNumber,
        phone: appointment.customer.PhoneNumber
      } : null
    };

    // If this is for history form and user is not authenticated,
    // only return necessary fields for form pre-filling
    if (forHistoryForm && !session?.user?.email) {
      const limitedData = {
        id: normalizedAppointment.id,
        species: normalizedAppointment.species,
        gender: normalizedAppointment.gender,
        description: normalizedAppointment.description,
        isEmergency: normalizedAppointment.isEmergency,
        appointmentAt: normalizedAppointment.appointmentAt,
        city: normalizedAppointment.city,
        state: normalizedAppointment.state,
        fullAddress: normalizedAppointment.fullAddress,
        doctor: normalizedAppointment.doctor,
        customer: normalizedAppointment.customer ? {
          name: normalizedAppointment.customer.name,
          contact: normalizedAppointment.customer.contact,
          phone: normalizedAppointment.customer.phone,
          PhoneNumber: normalizedAppointment.customer.PhoneNumber
        } : null
      };
      return Response.json(limitedData);
    }

    return Response.json(normalizedAppointment);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch appointment" }), { status: 500 });
  }
}

// DELETE - Delete single appointment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appointmentId = parseInt(id);

    if (isNaN(appointmentId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid appointment ID' }),
        { status: 400 }
      );
    }

    // Check if appointment exists
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id: appointmentId },
      include: {
        paymentInfo: true,
        historyForm: true
      }
    });

    if (!appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404 }
      );
    }

    // Delete related records and appointment in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete payment screenshot from Cloudinary if exists
      if (appointment.paymentInfo?.screenshotPublicId) {
        try {
          const { deleteFromCloudinary } = await import('@/lib/cloudinary');
          await deleteFromCloudinary(appointment.paymentInfo.screenshotPublicId, 'image');
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
          // Continue with database deletion even if Cloudinary deletion fails
        }
      }

      // Delete payment info (cascades to appointment)
      if (appointment.paymentInfo) {
        await tx.paymentInfo.delete({
          where: { id: appointment.paymentInfo.id }
        });
      }

      // Delete history form if exists
      if (appointment.historyForm) {
        await tx.historyForm.delete({
          where: { id: appointment.historyForm.id }
        });
      }

      // Delete related transactions
      await tx.transaction.deleteMany({
        where: { appointmentId: appointmentId }
      });

      // Delete email logs
      await tx.emailLog.deleteMany({
        where: { appointmentId: appointmentId }
      });

      // Delete the appointment
      await tx.appointmentRequest.delete({
        where: { id: appointmentId }
      });
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Appointment deleted successfully'
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete appointment' }),
      { status: 500 }
    );
  }
}