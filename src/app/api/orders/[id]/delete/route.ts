import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Await the params object first
  const { id } = await params;
  const numericOrderId = Number(id);

  if (isNaN(numericOrderId)) {
    return NextResponse.json({ error: 'Invalid Order ID' }, { status: 400 });
  }

  try {
    await prisma.checkout.delete({
      where: { id: numericOrderId },
    });

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}

