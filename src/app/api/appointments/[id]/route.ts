import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
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
    
    return Response.json(appointment);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch appointment" }), { status: 500 });
  }
}