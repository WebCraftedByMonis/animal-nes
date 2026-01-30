import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { validateCompanySession } from '@/lib/auth/company-auth';
import fs from 'fs/promises';
import path from 'path';

// Helper to get company from session
async function getCompanyFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('company-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const company = await validateCompanySession(token);
    return company || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const company = await getCompanyFromSession();

  if (!company) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const branded = url.searchParams.get('branded') === 'true';
  const numericOrderId = Number(id);

  if (isNaN(numericOrderId)) {
    return NextResponse.json({ error: 'Invalid Order ID' }, { status: 400 });
  }

  // Fetch order with items that belong to this company's products
  const order = await prisma.checkout.findUnique({
    where: { id: numericOrderId },
    include: {
      items: {
        where: {
          product: {
            companyId: company.id
          }
        },
        include: {
          product: true,
          variant: true,
        },
      },
      user: true,
    },
  });

  if (!order || order.items.length === 0) {
    return NextResponse.json({ error: 'Order not found or no items from your company' }, { status: 404 });
  }

  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Define colors
  const primaryColor = rgb(0.141, 0.482, 0.318); // Green
  const darkGray = rgb(0.2, 0.2, 0.2);
  const mediumGray = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const veryLightGray = rgb(0.95, 0.95, 0.95);
  const blueColor = rgb(0.1, 0.3, 0.6);

  let currentY = pageHeight - 70;

  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (currentY < margin + requiredSpace) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - 70;
      return true;
    }
    return false;
  };

  // Helper function to draw centered text
  const drawCenteredText = (text: string, y: number, size: number, textFont: typeof font, color: typeof primaryColor) => {
    const textWidth = textFont.widthOfTextAtSize(text, size);
    const x = (pageWidth - textWidth) / 2;
    page.drawText(text, { x, y, size, font: textFont, color });
  };

  // HEADER SECTION
  if (branded) {
    // Try to load and draw logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
      const logoBytes = await fs.readFile(logoPath);
      const logoImage = await pdfDoc.embedJpg(logoBytes);

      const logoSize = 50;
      const logoX = (pageWidth - logoSize) / 2;

      page.drawImage(logoImage, {
        x: logoX,
        y: currentY - logoSize,
        width: logoSize,
        height: logoSize,
      });

      currentY -= logoSize + 10;
    } catch (error) {
      console.log('Logo not found, proceeding without logo');
    }

    // Company Name
    drawCenteredText('Animal Wellness Shop', currentY, 22, boldFont, primaryColor);
    currentY -= 25;

    // Website
    drawCenteredText('www.animalwellness.shop', currentY, 11, font, mediumGray);
    currentY -= 35;

    // Decorative line
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: pageWidth - margin, y: currentY },
      thickness: 2,
      color: primaryColor,
    });
    currentY -= 35;
  }

  // VENDOR INVOICE HEADER BOX
  const invoiceBoxHeight = 45;
  page.drawRectangle({
    x: margin,
    y: currentY - invoiceBoxHeight,
    width: contentWidth,
    height: invoiceBoxHeight,
    borderColor: blueColor,
    borderWidth: 1.5,
    color: veryLightGray,
  });

  // Vendor Invoice text and number
  page.drawText('VENDOR INVOICE', {
    x: margin + 15,
    y: currentY - 28,
    size: 18,
    font: boldFont,
    color: blueColor,
  });

  const invoiceNumber = `#${order.id.toString().padStart(6, '0')}`;
  page.drawText(invoiceNumber, {
    x: pageWidth - margin - 100,
    y: currentY - 28,
    size: 18,
    font: boldFont,
    color: darkGray,
  });

  currentY -= invoiceBoxHeight + 35;

  // VENDOR INFORMATION (Two columns)
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;

  // Section headers
  page.drawText('VENDOR (SUPPLIER):', {
    x: leftColX,
    y: currentY,
    size: 11,
    font: boldFont,
    color: blueColor,
  });

  page.drawText('INVOICE DETAILS:', {
    x: rightColX,
    y: currentY,
    size: 11,
    font: boldFont,
    color: blueColor,
  });

  currentY -= 20;

  // Company name
  page.drawText(company.companyName || 'N/A', {
    x: leftColX,
    y: currentY,
    size: 11,
    font: boldFont,
    color: darkGray,
  });

  // Date
  page.drawText('Date:', {
    x: rightColX,
    y: currentY,
    size: 10,
    font: boldFont,
    color: mediumGray,
  });

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  page.drawText(formattedDate, {
    x: rightColX + 60,
    y: currentY,
    size: 10,
    font,
    color: darkGray,
  });

  currentY -= 18;

  // Email
  page.drawText(company.email || '-', {
    x: leftColX,
    y: currentY,
    size: 10,
    font,
    color: darkGray,
  });

  // Order ID
  page.drawText('Order ID:', {
    x: rightColX,
    y: currentY,
    size: 10,
    font: boldFont,
    color: mediumGray,
  });

  page.drawText(`#${order.id}`, {
    x: rightColX + 60,
    y: currentY,
    size: 10,
    font,
    color: darkGray,
  });

  currentY -= 18;

  // Phone
  if (company.mobileNumber) {
    page.drawText(company.mobileNumber, {
      x: leftColX,
      y: currentY,
      size: 10,
      font,
      color: darkGray,
    });
  }

  // Status
  page.drawText('Status:', {
    x: rightColX,
    y: currentY,
    size: 10,
    font: boldFont,
    color: mediumGray,
  });

  page.drawText(order.status || 'Pending', {
    x: rightColX + 60,
    y: currentY,
    size: 10,
    font,
    color: primaryColor,
  });

  currentY -= 18;

  // Address
  if (company.address) {
    page.drawText(company.address, {
      x: leftColX,
      y: currentY,
      size: 10,
      font,
      color: darkGray,
    });
  }

  currentY -= 40;

  // SHIPPED TO SECTION
  page.drawText('SHIPPED TO:', {
    x: leftColX,
    y: currentY,
    size: 11,
    font: boldFont,
    color: blueColor,
  });

  currentY -= 18;

  page.drawText(order.user?.name || 'N/A', {
    x: leftColX,
    y: currentY,
    size: 10,
    font: boldFont,
    color: darkGray,
  });

  currentY -= 15;

  page.drawText(`${order.address}, ${order.city}, ${order.province}`, {
    x: leftColX,
    y: currentY,
    size: 10,
    font,
    color: darkGray,
  });

  if (order.shippingAddress) {
    currentY -= 15;
    page.drawText(`Phone: ${order.shippingAddress}`, {
      x: leftColX,
      y: currentY,
      size: 10,
      font,
      color: darkGray,
    });
  }

  currentY -= 35;

  // ORDER ITEMS TABLE
  page.drawText('ITEMS SUPPLIED', {
    x: margin,
    y: currentY,
    size: 11,
    font: boldFont,
    color: blueColor,
  });

  currentY -= 20;

  // Table header background
  page.drawRectangle({
    x: 0,
    y: currentY - 20,
    width: pageWidth,
    height: 25,
    color: lightGray,
  });

  // Table headers
  const col1X = margin + 5;
  const col2X = margin + 25;  // Description
  const col3X = pageWidth - 280;  // Variant
  const col4X = pageWidth - 200;  // Qty
  const col5X = pageWidth - 140;  // Purchased Price
  const col6X = pageWidth - 70;   // Total

  page.drawText('#', { x: col1X, y: currentY - 15, size: 9, font: boldFont, color: darkGray });
  page.drawText('Product', { x: col2X, y: currentY - 15, size: 9, font: boldFont, color: darkGray });
  page.drawText('Variant', { x: col3X, y: currentY - 15, size: 9, font: boldFont, color: darkGray });
  page.drawText('Qty', { x: col4X, y: currentY - 15, size: 9, font: boldFont, color: darkGray });
  page.drawText('Cost Price', { x: col5X, y: currentY - 15, size: 9, font: boldFont, color: darkGray });
  page.drawText('Total', { x: col6X, y: currentY - 15, size: 9, font: boldFont, color: darkGray });

  currentY -= 35;

  // Table items
  let subtotal = 0;

  order.items.forEach((item, index) => {
    checkNewPage(30);

    // Draw row background for even rows
    if (index % 2 === 0) {
      page.drawRectangle({
        x: 0,
        y: currentY - 15,
        width: pageWidth,
        height: 20,
        color: veryLightGray,
      });
    }

    const productName = item.product?.productName || 'Product';
    const variant = item.variant?.packingVolume || '-';

    // Use purchasedPrice if set, otherwise use variant's companyPrice
    const purchasedPrice = item.purchasedPrice || item.variant?.companyPrice || 0;
    const itemTotal = purchasedPrice * item.quantity;
    subtotal += itemTotal;

    // Item number
    page.drawText((index + 1).toString(), {
      x: col1X,
      y: currentY - 10,
      size: 9,
      font,
      color: darkGray,
    });

    // Product name (truncate if needed)
    let displayName = productName;
    if (displayName.length > 30) {
      displayName = displayName.substring(0, 27) + '...';
    }

    page.drawText(displayName, {
      x: col2X,
      y: currentY - 10,
      size: 8,
      font,
      color: darkGray,
    });

    // Variant
    page.drawText(variant, {
      x: col3X,
      y: currentY - 10,
      size: 8,
      font,
      color: darkGray,
    });

    // Quantity
    page.drawText(item.quantity.toString(), {
      x: col4X,
      y: currentY - 10,
      size: 8,
      font,
      color: darkGray,
    });

    // Purchased Price
    page.drawText(`${purchasedPrice.toFixed(2)}`, {
      x: col5X,
      y: currentY - 10,
      size: 8,
      font,
      color: darkGray,
    });

    // Total
    page.drawText(`${itemTotal.toFixed(2)}`, {
      x: col6X,
      y: currentY - 10,
      size: 8,
      font,
      color: darkGray,
    });

    currentY -= 25;
  });

  // Draw bottom line of table
  page.drawLine({
    start: { x: margin, y: currentY + 10 },
    end: { x: pageWidth - margin, y: currentY + 10 },
    thickness: 1,
    color: mediumGray,
  });

  currentY -= 30;

  // SUMMARY SECTION
  const summaryX = pageWidth - 250;
  const summaryValueX = pageWidth - 100;

  // Summary box
  page.drawRectangle({
    x: summaryX - 10,
    y: currentY - 70,
    width: 220,
    height: 65,
    borderColor: lightGray,
    borderWidth: 1,
  });

  // Subtotal
  page.drawText('Subtotal:', {
    x: summaryX,
    y: currentY - 20,
    size: 11,
    font,
    color: mediumGray,
  });

  page.drawText(`PKR ${subtotal.toFixed(2)}`, {
    x: summaryValueX,
    y: currentY - 20,
    size: 11,
    font,
    color: darkGray,
  });

  // Divider
  page.drawLine({
    start: { x: summaryX, y: currentY - 35 },
    end: { x: summaryX + 200, y: currentY - 35 },
    thickness: 1,
    color: mediumGray,
  });

  // Total
  page.drawText('TOTAL DUE:', {
    x: summaryX,
    y: currentY - 55,
    size: 13,
    font: boldFont,
    color: blueColor,
  });

  page.drawText(`PKR ${subtotal.toFixed(2)}`, {
    x: summaryValueX,
    y: currentY - 55,
    size: 13,
    font: boldFont,
    color: blueColor,
  });

  currentY -= 100;

  // Note section
  checkNewPage(80);

  page.drawRectangle({
    x: margin,
    y: currentY - 50,
    width: contentWidth,
    height: 45,
    color: rgb(0.95, 0.97, 1),
    borderColor: blueColor,
    borderWidth: 0.5,
  });

  page.drawText('Note:', {
    x: margin + 10,
    y: currentY - 20,
    size: 10,
    font: boldFont,
    color: blueColor,
  });

  page.drawText('This is a vendor invoice showing the cost price of products supplied.', {
    x: margin + 45,
    y: currentY - 20,
    size: 9,
    font,
    color: darkGray,
  });

  page.drawText('Payment terms as per agreement with Animal Wellness Shop.', {
    x: margin + 10,
    y: currentY - 38,
    size: 9,
    font,
    color: darkGray,
  });

  currentY -= 70;

  // FOOTER
  if (branded) {
    checkNewPage(60);

    drawCenteredText(
      'This is a computer generated invoice.',
      currentY,
      9,
      font,
      mediumGray
    );

    currentY -= 25;

    // Thank you message
    page.drawRectangle({
      x: margin,
      y: currentY - 30,
      width: contentWidth,
      height: 35,
      color: rgb(0.95, 0.97, 1),
    });

    drawCenteredText('Thank you for being our valued vendor partner!', currentY - 15, 12, boldFont, blueColor);

    // Final decorative line
    page.drawLine({
      start: { x: margin, y: 30 },
      end: { x: pageWidth - margin, y: 30 },
      thickness: 2,
      color: blueColor,
    });
  }

  // Generate PDF
  const pdfBytes = await pdfDoc.save();
  const filename = branded
    ? `Vendor-Invoice-${order.id}-${company.companyName?.replace(/\s+/g, '-') || 'company'}.pdf`
    : `Vendor-Invoice-${order.id}.pdf`;

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  });
}
