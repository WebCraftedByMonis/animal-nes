// app/api/appointments/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyVeterinarians } from "@/lib/email-service";

export async function PATCH(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Parse and validate request body
    const { id, status } = await req.json();
    
    if (!id || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid input. ID and valid status required." }, 
        { status: 400 }
      );
    }

    const appointmentId = parseInt(id);
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { error: "Invalid appointment ID" }, 
        { status: 400 }
      );
    }

    // Get appointment details before updating
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id: appointmentId },
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
        { error: "Appointment not found" }, 
        { status: 404 }
      );
    }

    // Check if status is actually changing
    const isStatusChanging = appointment.status !== status;
    const isBeingApproved = isStatusChanging && status === "APPROVED";

    // Update the appointment status
    const updated = await prisma.appointmentRequest.update({
      where: { id: appointmentId },
      data: { status },
    });

    // Send notifications only when appointment is being approved for the first time
    if (isBeingApproved) {
      try {
        console.log(`Appointment ${appointmentId} approved, finding veterinarians in ${appointment.city}...`);

        // Get veterinarians in the same city with valid emails, filtered by country if available
        const veterinarians = await prisma.partner.findMany({
          where: {
            partnerType: 'Veterinarian (Clinic, Hospital, Consultant)',
            cityName: {
              equals: appointment.city,

            },
            partnerEmail: {
              not: null
            },
            ...(appointment.country ? { country: appointment.country } : {})
          },
          select: {
            id: true,
            partnerName: true,
            partnerMobileNumber: true,
            partnerEmail: true,
            specialization: true,
            cityName: true,
            country: true
          }
        });

        if (veterinarians.length === 0) {
          console.log(`No veterinarians found in ${appointment.city}`);
          
          // Try to find veterinarians in the same state as fallback
          if (appointment.state) {
            const stateVeterinarians = await prisma.partner.findMany({
              where: {
                partnerType: 'Veterinarian (Clinic, Hospital, Consultant)',
                state: {
                  equals: appointment.state,

                },
                partnerEmail: {
                  not: null
                },
                ...(appointment.country ? { country: appointment.country } : {})
              },
              select: {
                id: true,
                partnerName: true,
                partnerMobileNumber: true,
                partnerEmail: true,
                specialization: true,
                cityName: true,
                state: true,
                country: true
              },
              take: 5 // Limit to 5 vets from state to avoid spam
            });

            if (stateVeterinarians.length > 0) {
              console.log(`Found ${stateVeterinarians.length} veterinarians in state ${appointment.state}`);
              
              // Send email notifications to state veterinarians
              const emailResults = await notifyVeterinarians(appointment, stateVeterinarians);
              const successCount = emailResults.filter(r => r.success).length;
              
              console.log(`Emails sent to ${successCount}/${stateVeterinarians.length} state veterinarians`);
              
              return NextResponse.json({
                success: true,
                updated,
                message: `Appointment approved. Notified ${successCount} veterinarian(s) in ${appointment.state} state (none found in ${appointment.city})`,
                notificationDetails: {
                  searchType: 'state',
                  totalFound: stateVeterinarians.length,
                  emailsSent: successCount,
                  failedEmails: emailResults.filter(r => !r.success).map(r => r.veterinarian)
                }
              });
            }
          }
          
          // No veterinarians found at all
          return NextResponse.json({
            success: true,
            updated,
            message: `Appointment approved but no veterinarians found in ${appointment.city} or ${appointment.state || 'the state'}`,
            notificationDetails: {
              searchType: 'none',
              totalFound: 0,
              emailsSent: 0
            }
          });
        }

        // Found veterinarians in the city - send notifications
        console.log(`Found ${veterinarians.length} veterinarian(s) in ${appointment.city}`);
        
        // Send email notifications
        const emailResults = await notifyVeterinarians(appointment, veterinarians);
        
        // Count successful and failed sends
        const successCount = emailResults.filter(r => r.success).length;
        const failedEmails = emailResults.filter(r => !r.success);
        
        console.log(`Successfully sent ${successCount}/${veterinarians.length} emails`);
        
        if (failedEmails.length > 0) {
          console.error('Failed to send emails to:', failedEmails.map(f => f.veterinarian));
        }

        // Return detailed response
        return NextResponse.json({
          success: true,
          updated,
          message: `Appointment approved and ${successCount} veterinarian(s) notified via email`,
          notificationDetails: {
            searchType: 'city',
            totalFound: veterinarians.length,
            emailsSent: successCount,
            failedEmails: failedEmails.map(f => f.veterinarian)
          }
        });

      } catch (notificationError) {
        console.error('Error sending veterinarian notifications:', notificationError);
        
        // Don't fail the status update if notification fails
        return NextResponse.json({
          success: true,
          updated,
          message: "Appointment approved but failed to send notifications",
          warning: "Notification system error - please check logs",
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
        });
      }
    }

    // Status updated but not approved (or already was approved)
    return NextResponse.json({
      success: true,
      updated,
      message: `Status updated to ${status}`,
      statusChanged: isStatusChanging
    });

  } catch (error) {
    console.error('Error updating appointment status:', error);
    
    return NextResponse.json(
      { 
        error: "Failed to update status",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}