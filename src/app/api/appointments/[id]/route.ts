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
    
    // If this is for history form and user is not authenticated, 
    // only return necessary fields for form pre-filling
    if (forHistoryForm && !session?.user?.email) {
      const limitedData = {
        id: appointment.id,
        species: appointment.species,
        gender: appointment.gender,
        description: appointment.description,
        isEmergency: appointment.isEmergency,
        appointmentAt: appointment.appointmentAt,
        city: appointment.city,
        state: appointment.state,
        fullAddress: appointment.fullAddress,
        customer: appointment.customer ? {
          name: appointment.customer.name,
          contact: appointment.customer.PhoneNumber,
          phone: appointment.customer.PhoneNumber
        } : null
      };
      return Response.json(limitedData);
    }
    
    return Response.json(appointment);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch appointment" }), { status: 500 });
  }
}