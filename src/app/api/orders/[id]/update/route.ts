import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Await the params object first
  const { id } = await params;
  const body = await req.json();

  // Add shipmentcharges to the destructured body
  const { paymentMethod, items, shipmentcharges } = body;

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

    // Calculate the new total including shipment charges
    const itemsTotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    // Parse shipment charges (ensure it's a number)
    const shipmentChargesValue = parseFloat(shipmentcharges) || 0;
    const newTotal = itemsTotal + shipmentChargesValue;

    // Update Payment Method, Shipment Charges, and Total in Checkout table
    await prisma.checkout.update({
      where: { id: Number(id) },
      data: {
        paymentMethod,
        shipmentcharges: shipmentChargesValue.toString(), // Store as string to match your schema
        total: newTotal,
      },
    });

    return NextResponse.json({ 
      message: 'Order updated successfully',
      newTotal,
      shipmentcharges: shipmentChargesValue
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}