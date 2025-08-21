// app/api/veterinarians/by-city/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET veterinarians by city for appointment matching
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const appointmentId = searchParams.get('appointmentId');
    
    if (!city) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 }
      );
    }

    // Fetch all veterinarians in the specified city
    const veterinarians = await prisma.partner.findMany({
      where: {
        // Filter by veterinarian partner type
        partnerType: 'Veterinarian (Clinic, Hospital, Consultant)',
        // Match city (case insensitive)
        cityName: {
          equals: city,
         
        }
      },
      select: {
        id: true,
        partnerName: true,
        partnerEmail: true,
        partnerMobileNumber: true,
        cityName: true,
        shopName: true,
        specialization: true,
        fullAddress: true,
        availableDaysOfWeek: {
          select: {
            day: true
          }
        }
      }
    });

    // If no veterinarians found in exact city, try to find in same state
    let expandedSearch = false;
    if (veterinarians.length === 0 && appointmentId) {
      // Get appointment details to find state
      const appointment = await prisma.appointmentRequest.findUnique({
        where: { id: parseInt(appointmentId) },
        select: { state: true }
      });

      if (appointment?.state) {
        const stateVeterinarians = await prisma.partner.findMany({
          where: {
            partnerType: 'Veterinarian (Clinic, Hospital, Consultant)',
            state: {
              equals: appointment.state,
             
            }
          },
          select: {
            id: true,
            partnerName: true,
            partnerEmail: true,
            partnerMobileNumber: true,
            cityName: true,
            shopName: true,
            specialization: true,
            fullAddress: true,
            state: true,
            availableDaysOfWeek: {
              select: {
                day: true
              }
            }
          },
          take: 10 // Limit to 10 if searching by state
        });

        if (stateVeterinarians.length > 0) {
          expandedSearch = true;
          return NextResponse.json({
            veterinarians: stateVeterinarians,
            total: stateVeterinarians.length,
            searchType: 'state',
            message: `No veterinarians found in ${city}, showing veterinarians from ${appointment.state}`
          });
        }
      }
    }

    return NextResponse.json({
      veterinarians,
      total: veterinarians.length,
      city,
      searchType: 'city',
      message: veterinarians.length > 0 
        ? `Found ${veterinarians.length} veterinarian(s) in ${city}`
        : `No veterinarians found in ${city}`
    });

  } catch (error) {
    console.error('Error fetching veterinarians by city:', error);
    return NextResponse.json(
      { error: 'Failed to fetch veterinarians' },
      { status: 500 }
    );
  }
}

// POST - Send WhatsApp notifications to veterinarians
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, city, messageTemplate } = body;

    if (!appointmentId || !city) {
      return NextResponse.json(
        { error: 'Appointment ID and city are required' },
        { status: 400 }
      );
    }

    // Get appointment details with payment info
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id: parseInt(appointmentId) },
      include: {
        customer: true,
        paymentInfo: true,
        historyForm: {
          select: { id: true }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Get veterinarians in the city
    const veterinarians = await prisma.partner.findMany({
      where: {
        partnerType: 'Veterinarian (Clinic, Hospital, Consultant)',
        cityName: {
          equals: city,
          
        },
        partnerMobileNumber: {
          not: null
        }
      },
      select: {
        id: true,
        partnerName: true,
        partnerMobileNumber: true,
        partnerEmail: true
      }
    });

    if (veterinarians.length === 0) {
      return NextResponse.json(
        { error: 'No veterinarians found in this city' },
        { status: 404 }
      );
    }

    // Prepare message with appointment details
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://www.animalwellness.shop';
    const historyFormLink = `${baseUrl}/historyform?appointmentId=${appointmentId}`;
    const prescriptionFormLink = appointment.historyForm 
      ? `${baseUrl}/prescriptionform?historyFormId=${appointment.historyForm.id}`
      : 'History form must be filled first';

    const defaultMessage = `
🏥 *New Patient Alert*

*Location:* ${appointment.city}, ${appointment.state || 'Pakistan'}
*Animal:* ${appointment.species}
*Issue:* ${appointment.description}
*Emergency:* ${appointment.isEmergency ? 'YES ⚠️' : 'No'}
*Type:* ${appointment.paymentInfo?.consultationType || 'Not specified'}

*Patient Forms:*
📋 History Form: ${historyFormLink}
💊 Prescription Form: ${prescriptionFormLink}

Reply *YES* to accept this patient.
Reply *NO* if not available.
    `.trim();

    const message = messageTemplate || defaultMessage;

    // Log veterinarians to be notified (for now)
    // TODO: Integrate with WhatsApp Business API
    const notificationLog = {
      appointmentId,
      veterinariansNotified: veterinarians.map(v => ({
        id: v.id,
        name: v.partnerName,
        phone: v.partnerMobileNumber
      })),
      message,
      timestamp: new Date().toISOString()
    };

    console.log('WhatsApp Notification Log:', notificationLog);

    // Here you would integrate with WhatsApp Business API
    // For example using Twilio or WhatsApp Cloud API:
    /*
    for (const vet of veterinarians) {
      await sendWhatsAppMessage({
        to: vet.partnerMobileNumber,
        message: message
      });
    }
    */

    // For now, return the notification details
    return NextResponse.json({
      success: true,
      notified: veterinarians.length,
      veterinarians: veterinarians.map(v => ({
        name: v.partnerName,
        phone: v.partnerMobileNumber
      })),
      message,
      links: {
        historyForm: historyFormLink,
        prescriptionForm: prescriptionFormLink
      }
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}