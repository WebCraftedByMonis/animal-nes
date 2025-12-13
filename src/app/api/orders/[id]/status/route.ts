import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Await the params object first
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const updatedOrder = await prisma.checkout.update({
      where: { id: orderId },
      data: { status: 'delivered' },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Failed to update order status', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
