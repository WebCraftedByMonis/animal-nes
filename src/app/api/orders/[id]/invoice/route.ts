import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Await the params object first
  const { id } = await params;
  const url = new URL(req.url);
  const branded = url.searchParams.get('branded') === 'true';
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
  const drawCenteredText = (text: string, y: number, size: number, textFont: any, color: any) => {
    const textWidth = textFont.widthOfTextAtSize(text, size);
    const x = (pageWidth - textWidth) / 2;
    page.drawText(text, { x, y, size, font: textFont, color });
  };

  // HEADER SECTION
  if (branded) {
    // Try to load and draw logo
    let logoDrawn = false;
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
      logoDrawn = true;
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

  // INVOICE HEADER BOX
  const invoiceBoxHeight = 45;
  page.drawRectangle({
    x: margin,
    y: currentY - invoiceBoxHeight,
    width: contentWidth,
    height: invoiceBoxHeight,
    borderColor: primaryColor,
    borderWidth: 1.5,
    color: veryLightGray,
  });

  // Invoice text and number
  page.drawText('INVOICE', {
    x: margin + 15,
    y: currentY - 28,
    size: 18,
    font: boldFont,
    color: primaryColor,
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

  // BILLING INFORMATION (Two columns)
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;

  // Section headers
  page.drawText('BILL TO:', {
    x: leftColX,
    y: currentY,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });

  page.drawText('INVOICE DETAILS:', {
    x: rightColX,
    y: currentY,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });

  currentY -= 20;

  // Customer name and date
  page.drawText(order.user?.name || 'N/A', {
    x: leftColX,
    y: currentY,
    size: 11,
    font: boldFont,
    color: darkGray,
  });

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

  // Email and payment
  page.drawText(order.user?.email || '-', {
    x: leftColX,
    y: currentY,
    size: 10,
    font,
    color: darkGray,
  });

  page.drawText('Payment:', {
    x: rightColX,
    y: currentY,
    size: 10,
    font: boldFont,
    color: mediumGray,
  });

  currentY -= 18;

  // Payment method with support for up to 5 lines
  let paymentMethod = order.paymentMethod;
  const maxPaymentLength = 60;  // Increased to 60 characters per line
  let paymentLines = [];
  
  // Split payment method into lines
  while (paymentMethod.length > 0) {
    if (paymentMethod.length <= maxPaymentLength) {
      paymentLines.push(paymentMethod);
      break;
    }
    
    // Try to split at a space
    let splitPoint = maxPaymentLength;
    const spaceIndex = paymentMethod.lastIndexOf(' ', maxPaymentLength);
    if (spaceIndex > maxPaymentLength - 15) {
      splitPoint = spaceIndex;
    }
    
    paymentLines.push(paymentMethod.substring(0, splitPoint).trim());
    paymentMethod = paymentMethod.substring(splitPoint).trim();
    
    // Limit to 5 lines
    if (paymentLines.length >= 5) {
      if (paymentMethod.length > 0) {
        paymentLines[4] = paymentLines[4].substring(0, 57) + '...';
      }
      break;
    }
  }
  
  // Draw payment method lines
  paymentLines.forEach((line, index) => {
    page.drawText(line, {
      x: rightColX,
      y: currentY,
      size: 9,
      font,
      color: darkGray,
    });
    currentY -= 14;
  });

  currentY -= 4;

  // Address with "Address:" label and status
  page.drawText('Address:', {
    x: leftColX,
    y: currentY,
    size: 10,
    font: boldFont,
    color: mediumGray,
  });

  page.drawText('', {
    x: rightColX,
    y: currentY,
    size: 10,
    font: boldFont,
    color: mediumGray,
  });
  
  page.drawText('', {
    x: rightColX + 45,
    y: currentY,
    size: 10,
    font,
    color: primaryColor,
  });

  currentY -= 18;

  // Full address
  page.drawText(order.address, {
    x: leftColX,
    y: currentY,
    size: 10,
    font,
    color: darkGray,
  });

  currentY -= 18;

  // City, Province
  page.drawText(`${order.city}, ${order.province}`, {
    x: leftColX,
    y: currentY,
    size: 10,
    font,
    color: darkGray,
  });

  currentY -= 18;

  // Phone if available
  if (order.shippingAddress) {
    page.drawText(`Phone: ${order.shippingAddress}`, {
      x: leftColX,
      y: currentY,
      size: 10,
      font,
      color: darkGray,
    });
    currentY -= 18;
  }

  currentY -= 25;

  // ORDER ITEMS TABLE
  page.drawText('ORDER ITEMS', {
    x: margin,
    y: currentY,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });

  currentY -= 20;

  // Table header background - Full width
  page.drawRectangle({
    x: 0,
    y: currentY - 20,
    width: pageWidth,
    height: 25,
    color: lightGray,
  });

  // Table headers - Adjusted for discount column
  const col1X = margin + 5;
  const col2X = margin + 20;  // Description
  const col3X = pageWidth - 320;  // Qty
  const col4X = pageWidth - 270;  // Original Price (MRP)
  const col5X = pageWidth - 205;  // Discount
  const col6X = pageWidth - 140;  // Price
  const col7X = pageWidth - 70;   // Total

  page.drawText('#', {
    x: col1X,
    y: currentY - 15,
    size: 9,
    font: boldFont,
    color: darkGray,
  });

  page.drawText('Description', {
    x: col2X,
    y: currentY - 15,
    size: 9,
    font: boldFont,
    color: darkGray,
  });

  page.drawText('Qty', {
    x: col3X,
    y: currentY - 15,
    size: 9,
    font: boldFont,
    color: darkGray,
  });

  page.drawText('MRP', {
    x: col4X,
    y: currentY - 15,
    size: 9,
    font: boldFont,
    color: darkGray,
  });

  page.drawText('Disc%', {
    x: col5X,
    y: currentY - 15,
    size: 9,
    font: boldFont,
    color: darkGray,
  });

  page.drawText('Price', {
    x: col6X,
    y: currentY - 15,
    size: 9,
    font: boldFont,
    color: darkGray,
  });

  page.drawText('Total', {
    x: col7X,
    y: currentY - 15,
    size: 9,
    font: boldFont,
    color: darkGray,
  });

  currentY -= 35;

  // Table items
  let subtotal = 0;
  let totalSavings = 0;
  const discountColor = rgb(0.8, 0.2, 0.2); // Red for discount

  order.items.forEach((item, index) => {
    checkNewPage(30);

    // Draw row background for even rows - Full width
    if (index % 2 === 0) {
      page.drawRectangle({
        x: 0,
        y: currentY - 15,
        width: pageWidth,
        height: 20,
        color: veryLightGray,
      });
    }

    const itemName = item.animal
      ? `${item.animal.specie}${item.animal.breed ? ` (${item.animal.breed})` : ''}`
      : `${item.product?.productName || 'Product'}${item.variant?.packingVolume ? ` - ${item.variant.packingVolume}` : ''}`;

    const itemPrice = item.price;
    const originalPrice = (item as any).originalPrice || item.price;
    const discountPercentage = (item as any).discountPercentage || 0;
    const itemTotal = itemPrice * item.quantity;
    subtotal += itemTotal;

    // Calculate savings for this item
    if (discountPercentage > 0) {
      totalSavings += (originalPrice - itemPrice) * item.quantity;
    }

    // Item number
    page.drawText((index + 1).toString(), {
      x: col1X,
      y: currentY - 10,
      size: 9,
      font,
      color: darkGray,
    });

    // Description (truncate if needed for spacing)
    let displayName = itemName;
    const maxDescLength = 28;  // Allow longer descriptions
    if (displayName.length > maxDescLength) {
      displayName = displayName.substring(0, maxDescLength - 3) + '...';
    }

    page.drawText(displayName, {
      x: col2X,
      y: currentY - 10,
      size: 8,
      font,
      color: darkGray,
    });

    // Quantity
    page.drawText(item.quantity.toString(), {
      x: col3X,
      y: currentY - 10,
      size: 8,
      font,
      color: darkGray,
    });

    // Original Price (MRP) - show with 2 decimals
    page.drawText(`${originalPrice.toFixed(2)}`, {
      x: col4X,
      y: currentY - 10,
      size: 8,
      font,
      color: discountPercentage > 0 ? mediumGray : darkGray,
    });

    // Discount Percentage
    if (discountPercentage > 0) {
      page.drawText(`${discountPercentage}%`, {
        x: col5X,
        y: currentY - 10,
        size: 8,
        font: boldFont,
        color: discountColor,
      });
    } else {
      page.drawText('-', {
        x: col5X,
        y: currentY - 10,
        size: 8,
        font,
        color: mediumGray,
      });
    }

    // Final Price - show with 2 decimals
    page.drawText(`${itemPrice.toFixed(2)}`, {
      x: col6X,
      y: currentY - 10,
      size: 8,
      font: discountPercentage > 0 ? boldFont : font,
      color: discountPercentage > 0 ? primaryColor : darkGray,
    });

    // Total - show with 2 decimals
    page.drawText(`${itemTotal.toFixed(2)}`, {
      x: col7X,
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

  currentY -= 20;

  // SUMMARY SECTION (Right aligned) - Adjusted for more space
  const summaryX = pageWidth - 280;  // Moved left for more room
  const summaryValueX = pageWidth - 130;  // Values have more space
  const hasSavings = totalSavings > 0;

  // Summary box - taller if there are savings
  const summaryBoxHeight = hasSavings ? 120 : 100;
  page.drawRectangle({
    x: summaryX - 10,
    y: currentY - summaryBoxHeight - 5,
    width: 260,  // Wider box
    height: summaryBoxHeight,
    borderColor: lightGray,
    borderWidth: 1,
  });

  let summaryYOffset = 20;

  // Subtotal
  page.drawText('Subtotal:', {
    x: summaryX,
    y: currentY - summaryYOffset,
    size: 11,
    font,
    color: mediumGray,
  });

  page.drawText(`PKR ${subtotal.toFixed(2)}`, {
    x: summaryValueX,
    y: currentY - summaryYOffset,
    size: 11,
    font,
    color: darkGray,
  });

  summaryYOffset += 20;

  // Show savings if there are discounts
  if (hasSavings) {
    page.drawText('You Saved:', {
      x: summaryX,
      y: currentY - summaryYOffset,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.6, 0.1), // Green color for savings
    });

    page.drawText(`- PKR ${totalSavings.toFixed(2)}`, {
      x: summaryValueX,
      y: currentY - summaryYOffset,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.6, 0.1),
    });

    summaryYOffset += 20;
  }

  // Shipping
  const shipmentCharges = parseFloat(order.shipmentcharges || '0');
  page.drawText('Shipping:', {
    x: summaryX,
    y: currentY - summaryYOffset,
    size: 11,
    font,
    color: mediumGray,
  });

  page.drawText(`PKR ${shipmentCharges.toFixed(2)}`, {
    x: summaryValueX,
    y: currentY - summaryYOffset,
    size: 11,
    font,
    color: darkGray,
  });

  summaryYOffset += 15;

  // Divider line
  page.drawLine({
    start: { x: summaryX, y: currentY - summaryYOffset },
    end: { x: summaryX + 240, y: currentY - summaryYOffset },  // Adjusted line width
    thickness: 1,
    color: mediumGray,
  });

  summaryYOffset += 20;

  // Total
  const total = subtotal + shipmentCharges;
  page.drawText('TOTAL:', {
    x: summaryX,
    y: currentY - summaryYOffset,
    size: 13,
    font: boldFont,
    color: primaryColor,
  });

  page.drawText(`PKR ${total.toFixed(2)}`, {
    x: summaryValueX,
    y: currentY - summaryYOffset,
    size: 13,
    font: boldFont,
    color: primaryColor,
  });

  currentY -= summaryBoxHeight + 20;

  // FOOTER (for branded invoices)
  if (branded) {
    checkNewPage(300);

    // Computer generated notice
    drawCenteredText(
      'This is a computer generated invoice and does not require a signature.',
      currentY,
      9,
      font,
      mediumGray
    );

    currentY -= 30;

    // Thank you message box
    page.drawRectangle({
      x: margin,
      y: currentY - 35,
      width: contentWidth,
      height: 40,
      color: rgb(0.95, 0.98, 0.95),
    });

    drawCenteredText('Thank you for your purchase!', currentY - 15, 14, boldFont, primaryColor);
    currentY -= 55;

    // Contact section
    page.drawText('CONNECT WITH US', {
      x: margin,
      y: currentY,
      size: 11,
      font: boldFont,
      color: primaryColor,
    });

    currentY -= 20;

    // Contact info
    const contactItems = [
      { label: 'WhatsApp:', value: 'wa.me/923354145431' },
      { label: 'Website:', value: 'www.animalwellness.shop' },
      { label: 'Email:', value: 'support@animalwellness.shop' },
    ];

    contactItems.forEach(item => {
      page.drawText(item.label, {
        x: margin,
        y: currentY,
        size: 9,
        font: boldFont,
        color: mediumGray,
      });

      page.drawText(item.value, {
        x: margin + 70,
        y: currentY,
        size: 9,
        font,
        color: darkGray,
      });

      currentY -= 15;
    });

    currentY -= 15;

    // Social media section
    page.drawText('FOLLOW US ON SOCIAL MEDIA', {
      x: margin,
      y: currentY,
      size: 11,
      font: boldFont,
      color: primaryColor,
    });

    currentY -= 20;

    // Social media in two columns
    const socialMedia = [
      { platform: 'YouTube:', handle: '@AnimalWellNessShop' },
      { platform: 'Instagram:', handle: '@animalwellnessshop' },
      { platform: 'LinkedIn:', handle: 'Muhammad Fiaz Qamar' },
      { platform: 'X (Twitter):', handle: '@AnimalWellness' },
      { platform: 'Facebook:', handle: 'Animal Wellness Shop' },
      { platform: 'TikTok:', handle: '@animalwellnessshop' },
      { platform: 'Pinterest:', handle: 'Animal Wellness Shop' },
      { platform: 'Threads:', handle: '@animalwellnessshop' },
    ];

    socialMedia.forEach((item, index) => {
      const xPos = index % 2 === 0 ? margin : pageWidth / 2;
      const yPos = currentY - Math.floor(index / 2) * 18;

      page.drawText(item.platform, {
        x: xPos,
        y: yPos,
        size: 9,
        font: boldFont,
        color: mediumGray,
      });

      page.drawText(item.handle, {
        x: xPos + 65,
        y: yPos,
        size: 9,
        font,
        color: darkGray,
      });
    });

    currentY -= (Math.ceil(socialMedia.length / 2) * 18) + 25;

    // Check if we need a new page for URLs
    if (currentY < 150) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - 70;
    }

    // Full URLs section
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: pageWidth - margin, y: currentY },
      thickness: 0.5,
      color: lightGray,
    });

    currentY -= 15;

    page.drawText('Full URLs:', {
      x: margin,
      y: currentY,
      size: 8,
      font: boldFont,
      color: mediumGray,
    });

    currentY -= 12;

    const urls = [
      'https://wa.me/923354145431',
      'https://www.animalwellness.shop/',
      'https://www.youtube.com/@AnimalWellNessShop/videos',
      'https://x.com/c9d55c82df9b4da',
      'https://www.linkedin.com/in/muhammad-fiaz-qamar-195208a2/',
      'https://www.tiktok.com/@animal.wellness.s',
      'https://www.facebook.com/profile.php?id=61569643526062',
      'https://www.pinterest.com/pin/929360073111456519',
      'https://www.instagram.com/animalwellnessshop?igsh=Y3ZuYmNic21iNjZ0',
      'https://www.threads.com/@animalwellnessshop',
      'IMO: https://imolite.onelink.me/82A5/dhpd35zl',
    ];

    urls.forEach(url => {
      if (currentY < 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - 70;
      }

      page.drawText(url, {
        x: margin,
        y: currentY,
        size: 7,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });

      currentY -= 10;
    });

    // Final decorative line
    if (currentY > 35) {
      page.drawLine({
        start: { x: margin, y: 30 },
        end: { x: pageWidth - margin, y: 30 },
        thickness: 2,
        color: primaryColor,
      });
    }
  }

  // Generate PDF
  const pdfBytes = await pdfDoc.save();
  const filename = branded 
    ? `AWN-Invoice-${order.id}-${new Date().getTime()}.pdf` 
    : `Invoice-${order.id}.pdf`;

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  });
}