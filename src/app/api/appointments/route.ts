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
