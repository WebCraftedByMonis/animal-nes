import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    // Mark order as delivered and flip its PENDING transactions to COMPLETED in one go
    const [updatedOrder] = await Promise.all([
      prisma.checkout.update({
        where: { id: orderId },
        data: { status: 'delivered' },
      }),
      prisma.transaction.updateMany({
        where: { checkoutId: orderId, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      }),
    ]);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Failed to update order status', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
