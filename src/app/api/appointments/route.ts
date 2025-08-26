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
    const appointment = await prisma.appointmentRequest.create({
      data: {
        doctor,
        city,
        state,
        species,
        fullAddress,
        gender,
        appointmentAt: new Date(appointmentAt),
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
