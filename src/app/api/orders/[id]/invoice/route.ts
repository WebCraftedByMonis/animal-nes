import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const numericOrderId = Number(id);

  if (isNaN(numericOrderId)) {
    return NextResponse.json({ error: 'Invalid Order ID' }, { status: 400 });
  }

  const order = await prisma.checkout.findUnique({
    where: { id: numericOrderId },
    include: {
      items: {
        include: {
          animal: true,
          product: true,
          variant: true,
        },
      },
      user: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size in points
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  let y = height - 50;

  page.drawText(`Invoice for Order #${order.id}`, { x: 50, y, size: 20, font });
  y -= 30;

  page.drawText(`Customer: ${order.user?.name ?? 'N/A'} (${order.user?.email ?? '-'})`, { x: 50, y, size: fontSize, font });
  y -= 20;
  page.drawText(`Address: ${order.address}, ${order.city}, ${order.province}`, { x: 50, y, size: fontSize, font });
  y -= 20;
  page.drawText(`Shipping Address: ${order.shippingAddress}`, { x: 50, y, size: fontSize, font });
  y -= 20;
  page.drawText(`Payment Method: ${order.paymentMethod}`, { x: 50, y, size: fontSize, font });
  y -= 30;

  page.drawText(`Order Items:`, { x: 50, y, size: fontSize, font, color: rgb(0, 0, 0.8) });
  y -= 20;

  order.items.forEach((item, idx) => {
    const itemText = `${idx + 1}. ${item.animal?.specie ?? item.product?.productName ?? 'N/A'} - Quantity: ${item.quantity} - PKR ${item.price?.toFixed(2)}`;
    page.drawText(itemText, { x: 60, y, size: fontSize, font });
    y -= 18;

    if (y < 80) { // Check for page overflow
      y = height - 50;
      pdfDoc.addPage([595.28, 841.89]);
    }
  });

  y -= 20;
  page.drawText(`Total Amount: PKR ${order.total.toFixed(2)}`, { x: 50, y, size: 14, font, color: rgb(0.2, 0.6, 0.2) });

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${order.id}.pdf`,
    },
  });
}
