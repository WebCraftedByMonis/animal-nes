import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();

  const { paymentMethod, items } = body;

  try {
    // First, update all items
    for (const item of items) {
      await prisma.checkoutItem.update({
        where: { id: item.id },
        data: {
          quantity: item.quantity,
          price: item.price,
        },
      });
    }

    // Calculate the new total
    const newTotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Update Payment Method and Total in Checkout table
    await prisma.checkout.update({
      where: { id: Number(id) },
      data: {
        paymentMethod,
        total: newTotal,
      },
    });

    return NextResponse.json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}