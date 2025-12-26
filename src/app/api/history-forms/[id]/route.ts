import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' // adjust path if needed
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  // Await the params object first
  const { id: idString } = await params;
  const id = parseInt(idString, 10);
  
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const history = await prisma.historyForm.findUnique({
    where: { id },
    include: {
      appointment: {
        include: {
          assignedDoctor: true
        }
      }
    }
  });

  if (!history) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(history);
}