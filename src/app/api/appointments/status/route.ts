// PATCH /api/appointments/status
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id, status } = await req.json();

  if (!id || !["APPROVED", "REJECTED"].includes(status)) {
    return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
  }

  try {
    const updated = await prisma.appointmentRequest.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    return Response.json({ success: true, updated });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to update status" }), { status: 500 });
  }
}
