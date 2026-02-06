// src/app/api/appointments/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json();
  const {
    doctor,
    city,
    state,
    species,
    fullAddress,
    gender,
    appointmentAt,
    isEmergency,
    description,
    country,
  } = body;

  try {
    // Auto-generate appointment date if not provided (24 hours from now for processing)
    const autoAppointmentDate = appointmentAt && appointmentAt !== "" 
      ? new Date(appointmentAt) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const appointment = await prisma.appointmentRequest.create({
      data: {
        doctor,
        city,
        state,
        species,
        fullAddress,
        gender,
        appointmentAt: autoAppointmentDate,
        isEmergency,
        description,
        country,
        customer: {
          connect: { email: session.user.email },
        },
      },
    });

    return new Response(JSON.stringify(appointment), { status: 200 });
  } catch (error) {
    console.error("Failed to create appointment:", error);
    return new Response(JSON.stringify({ error: "Failed to create appointment" }), {
      status: 500,
    });
  }
}

// DELETE - Bulk delete appointments
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No appointment IDs provided' }),
        { status: 400 }
      );
    }

    // Fetch all appointments with their related data
    const appointments = await prisma.appointmentRequest.findMany({
      where: {
        id: { in: ids }
      },
      include: {
        paymentInfo: true,
        historyForm: true
      }
    });

    // Delete related records and appointments in a transaction
    await prisma.$transaction(async (tx) => {
      // Collect all screenshot public IDs for deletion
      const screenshotPublicIds = appointments
        .map(a => a.paymentInfo?.screenshotPublicId)
        .filter(Boolean) as string[];

      // Delete screenshots from Cloudinary
      if (screenshotPublicIds.length > 0) {
        try {
          const { deleteFromCloudinary } = await import('@/lib/cloudinary');
          await Promise.all(
            screenshotPublicIds.map(publicId =>
              deleteFromCloudinary(publicId, 'image').catch(err => {
                console.error('Error deleting from Cloudinary:', err);
              })
            )
          );
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
          // Continue with database deletion even if Cloudinary deletion fails
        }
      }

      // Delete payment info
      await tx.paymentInfo.deleteMany({
        where: { appointmentId: { in: ids } }
      });

      // Delete history forms
      await tx.historyForm.deleteMany({
        where: { appointmentId: { in: ids } }
      });

      // Delete related transactions
      await tx.transaction.deleteMany({
        where: { appointmentId: { in: ids } }
      });

      // Delete email logs
      await tx.emailLog.deleteMany({
        where: { appointmentId: { in: ids } }
      });

      // Delete the appointments
      const result = await tx.appointmentRequest.deleteMany({
        where: { id: { in: ids } }
      });

      return result;
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted ${appointments.length} appointment(s)`,
        deletedCount: appointments.length
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting appointments:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete appointments' }),
      { status: 500 }
    );
  }
}
