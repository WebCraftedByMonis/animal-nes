// api/email/webhook/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This webhook can be triggered by:
// 1. Email parsing services (SendGrid, Postmark, etc.)
// 2. Your own IMAP email checker
// 3. Manual admin processing

export async function POST(request: NextRequest) {
  try {
    const { from, subject, body } = await request.json();
    
    // Extract case ID from subject
    const caseMatch = subject.match(/Case (\d+)/i);
    const appointmentId = caseMatch ? parseInt(caseMatch[1]) : null;
    
    // Extract response (YES/NO)
    const response = body.toUpperCase().includes('YES') ? 'YES' : 
                    body.toUpperCase().includes('NO') ? 'NO' : null;
    
    if (!appointmentId || !response) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    
    // Find veterinarian by email
    const veterinarian = await prisma.partner.findFirst({
      where: {
        partnerEmail: from,
        partnerType: 'Veterinarian (Clinic, Hospital, Consultant)'
      }
    });
    
    if (!veterinarian) {
      return NextResponse.json({ error: 'Veterinarian not found' }, { status: 404 });
    }
    
    if (response === 'YES') {
      // TODO: Update appointment with assigned veterinarian
      console.log(`Dr. ${veterinarian.partnerName} accepted appointment ${appointmentId}`);
      
      // Send confirmation email
      // ...
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}