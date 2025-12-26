// src/app/api/appointments/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { getAcceptanceConfirmationEmail, getCaseTakenEmail, getPatientDoctorAssignmentEmail } from '@/lib/email-templates';

// Email logging helper
async function logEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  recipientType: string;
  subject: string;
  emailType: 'INITIAL_NOTIFICATION' | 'ACCEPTANCE_CONFIRMATION' | 'CASE_TAKEN' | 'PATIENT_ASSIGNMENT' | 'MASTER_TRAINER_APPROVAL' | 'OTHER';
  status: 'SENT' | 'FAILED' | 'PENDING';
  errorMessage?: string;
  appointmentId?: number;
  partnerId?: number;
  metadata?: any;
}) {
  try {
    await prisma.emailLog.create({
      data: {
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        recipientType: params.recipientType,
        subject: params.subject,
        emailType: params.emailType,
        status: params.status,
        errorMessage: params.errorMessage,
        appointmentId: params.appointmentId,
        partnerId: params.partnerId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        sentAt: params.status === 'SENT' ? new Date() : null,
      },
    });
  } catch (error) {
    console.error('Error logging email:', error);
  }
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const doctorId = searchParams.get('doctorId');
    const action = searchParams.get('action'); // 'accept' or 'decline'
    
    if (!appointmentId || !doctorId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    // Get appointment with all relations
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id: parseInt(appointmentId) },
      include: {
        customer: true,
        paymentInfo: true,
        historyForm: { select: { id: true } },
        assignedDoctor: true
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    
    // Check if already assigned
    if (appointment.assignedDoctorId) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Case Already Assigned</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; margin: 20px; text-align: center;">
            <div style="background: #fbbf24; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px;">
              <span style="color: white;">⚠</span>
            </div>
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px;">Case Already Assigned</h2>
            <p style="color: #6b7280; line-height: 1.6; margin: 0; font-size: 16px;">This case has already been accepted by Dr. ${appointment.assignedDoctor?.partnerName}.</p>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">Thank you for your interest in this case.</p>
            </div>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    // Get doctor
    const doctor = await prisma.partner.findUnique({
      where: { id: parseInt(doctorId) }
    });
    
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    
    if (action === 'accept') {
      // Use atomic update to prevent race condition - only update if not already assigned
      let updatedAppointment;
      try {
        updatedAppointment = await prisma.appointmentRequest.update({
          where: {
            id: parseInt(appointmentId),
            assignedDoctorId: null // Only update if not already assigned
          },
          data: {
            assignedDoctorId: parseInt(doctorId),
            assignedAt: new Date()
          },
          include: {
            customer: true,
            assignedDoctor: true,
            paymentInfo: true
          }
        });
      } catch (error) {
        // If update fails, appointment was already assigned - show already taken page
        const currentAppointment = await prisma.appointmentRequest.findUnique({
          where: { id: parseInt(appointmentId) },
          include: { assignedDoctor: true }
        });

        return new NextResponse(
          `<!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Case Already Assigned</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; margin: 20px; text-align: center;">
              <div style="background: #fbbf24; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px;">
                <span style="color: white;">⚠</span>
              </div>
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px;">Case Already Assigned</h2>
              <p style="color: #6b7280; line-height: 1.6; margin: 0; font-size: 16px;">This case has already been accepted by Dr. ${currentAppointment?.assignedDoctor?.partnerName || 'another doctor'}.</p>
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">Thank you for your interest in this case.</p>
              </div>
            </div>
          </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      // Note: Payment distribution (70% to doctor, 30% to revenue) happens when prescription is submitted
      // Note: History form will be created manually by the doctor

      const result = {
        updatedAppointment,
        historyFormId: appointment.historyForm?.id || null
      };
      
      // Prepare links - prescription form will only be available after history form is submitted
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.animalwellness.shop';
      const links = {
        historyForm: `${baseUrl}/historyform?appointmentId=${appointmentId}`,
        prescriptionForm: result.historyFormId ? `${baseUrl}/prescriptionform?historyFormId=${result.historyFormId}` : null
      };
      
      // Send full details email with both form links to doctor
      const confirmationEmail = getAcceptanceConfirmationEmail(doctor, appointment, links);

      try {
        await transporter.sendMail({
          from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
          to: doctor.partnerEmail,
          ...confirmationEmail
        });

        // Log successful confirmation email
        await logEmail({
          recipientEmail: doctor.partnerEmail!,
          recipientName: doctor.partnerName,
          recipientType: 'VET',
          subject: confirmationEmail.subject,
          emailType: 'ACCEPTANCE_CONFIRMATION',
          status: 'SENT',
          appointmentId: appointment.id,
          partnerId: parseInt(doctorId),
          metadata: {
            ownerPhone: appointment.doctor,
            species: appointment.species,
            city: appointment.city,
          },
        });
      } catch (error: any) {
        console.error('Failed to send confirmation email:', error);

        // Log failed confirmation email
        await logEmail({
          recipientEmail: doctor.partnerEmail!,
          recipientName: doctor.partnerName,
          recipientType: 'VET',
          subject: confirmationEmail.subject,
          emailType: 'ACCEPTANCE_CONFIRMATION',
          status: 'FAILED',
          errorMessage: error.message || String(error),
          appointmentId: appointment.id,
          partnerId: parseInt(doctorId),
        });
        throw error;
      }
      
      // Send notification email to patient
      if (appointment.customer?.email) {
        try {
          const patientEmail = getPatientDoctorAssignmentEmail(appointment, doctor);

          await transporter.sendMail({
            from: `"Animal Wellness Service" <${process.env.EMAIL_USER}>`,
            to: appointment.customer.email,
            ...patientEmail
          });

          // Log successful patient email
          await logEmail({
            recipientEmail: appointment.customer.email,
            recipientName: appointment.customer.name || undefined,
            recipientType: 'PATIENT',
            subject: patientEmail.subject,
            emailType: 'PATIENT_ASSIGNMENT',
            status: 'SENT',
            appointmentId: appointment.id,
            partnerId: parseInt(doctorId),
            metadata: {
              doctorName: doctor.partnerName,
              doctorEmail: doctor.partnerEmail,
              species: appointment.species,
              city: appointment.city,
            },
          });
        } catch (patientEmailError: any) {
          console.error('Failed to send patient notification email:', patientEmailError);

          // Log failed patient email
          await logEmail({
            recipientEmail: appointment.customer.email,
            recipientName: appointment.customer.name || undefined,
            recipientType: 'PATIENT',
            subject: patientEmail.subject,
            emailType: 'PATIENT_ASSIGNMENT',
            status: 'FAILED',
            errorMessage: patientEmailError.message || String(patientEmailError),
            appointmentId: appointment.id,
            partnerId: parseInt(doctorId),
          });
          // Don't fail the entire process if patient email fails
        }
      }
      
      // Notify other doctors that case is taken
      const otherDoctors = await prisma.partner.findMany({
        where: {
          partnerType: 'Veterinarian (Clinic, Hospital, Consultant)',
          cityName: appointment.city,
          id: { not: parseInt(doctorId) },
          partnerEmail: { not: null }
        }
      });
      
      for (const otherDoc of otherDoctors) {
        const caseTakenEmail = getCaseTakenEmail(otherDoc, appointment, doctor.partnerName);
        try {
          await transporter.sendMail({
            from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
            to: otherDoc.partnerEmail,
            ...caseTakenEmail
          });

          // Log successful case taken email
          await logEmail({
            recipientEmail: otherDoc.partnerEmail!,
            recipientName: otherDoc.partnerName,
            recipientType: 'VET',
            subject: caseTakenEmail.subject,
            emailType: 'CASE_TAKEN',
            status: 'SENT',
            appointmentId: appointment.id,
            partnerId: otherDoc.id,
            metadata: {
              acceptedByDoctor: doctor.partnerName,
              species: appointment.species,
              city: appointment.city,
            },
          });
        } catch (error: any) {
          console.error(`Failed to send case taken email to ${otherDoc.partnerEmail}:`, error);

          // Log failed case taken email
          await logEmail({
            recipientEmail: otherDoc.partnerEmail!,
            recipientName: otherDoc.partnerName,
            recipientType: 'VET',
            subject: caseTakenEmail.subject,
            emailType: 'CASE_TAKEN',
            status: 'FAILED',
            errorMessage: error.message || String(error),
            appointmentId: appointment.id,
            partnerId: otherDoc.id,
          });
          // Continue sending to other doctors even if one fails
        }
      }
      
      // Return success page
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Case Accepted Successfully</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #10b981 0%, #059669 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 600px; margin: 20px;">
            <div style="background: #10b981; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px;">
              <svg style="width: 48px; height: 48px;" fill="white" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 28px; text-align: center;">Case Accepted Successfully</h2>
            <p style="color: #6b7280; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px; text-align: center;">Thank you, <strong>Dr. ${doctor.partnerName}</strong>!</p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <p style="color: #374151; margin: 0 0 16px 0; font-weight: 600;">Patient details have been sent to your email:</p>
              <div style="margin: 12px 0;">
                <div style="display: flex; align-items: start; margin-bottom: 12px;">
                  <div style="background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; font-weight: bold; font-size: 12px;">1</div>
                  <div>
                    <strong style="color: #1f2937;">History Form</strong>
                    <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Please complete first for patient examination</p>
                  </div>
                </div>
                <div style="display: flex; align-items: start;">
                  <div style="background: #8b5cf6; color: white; width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; font-weight: bold; font-size: 12px;">2</div>
                  <div>
                    <strong style="color: #1f2937;">Prescription Form</strong>
                    <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Available after history form submission</p>
                  </div>
                </div>
              </div>
            </div>

            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
              <p style="color: #1e40af; margin: 0; font-size: 14px;"><strong>Owner Contact:</strong> ${appointment.doctor}</p>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Please start with the History Form. The Prescription Form link will be provided after the history form is completed.</p>
            </div>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
      
    } else {
      // Doctor declined
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Response Noted</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; margin: 20px; text-align: center;">
            <div style="background: #6366f1; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
              <svg style="width: 48px; height: 48px;" fill="white" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px;">Thank You</h2>
            <p style="color: #6b7280; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">We've noted that you're not available for this case.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
              <p style="color: #374151; margin: 0; font-size: 14px;">We'll notify you of future cases in your area.</p>
            </div>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
  } catch (error) {
    console.error('Error handling acceptance:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}