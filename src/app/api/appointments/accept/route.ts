// src/app/api/appointments/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { getAcceptanceConfirmationEmail, getCaseTakenEmail, getPatientDoctorAssignmentEmail } from '@/lib/email-templates';

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
    
    console.log('=== APPOINTMENT FETCH DEBUG ===');
    console.log('appointmentId:', appointmentId);
    console.log('appointment found:', !!appointment);
    if (appointment) {
      console.log('customer included:', {
        hasCustomer: !!appointment.customer,
        customerEmail: appointment.customer?.email,
        customerName: appointment.customer?.name
      });
    }
    
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    
    // Check if already assigned
    if (appointment.assignedDoctorId) {
      return new NextResponse(
        `<html><body style="font-family: Arial; padding: 50px; text-align: center;">
          <h2>Case Already Assigned</h2>
          <p>This case has already been accepted by Dr. ${appointment.assignedDoctor?.partnerName}.</p>
        </body></html>`,
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
      // Start a transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // 1. Assign doctor to appointment
        const updatedAppointment = await tx.appointmentRequest.update({
          where: { id: parseInt(appointmentId) },
          data: {
            assignedDoctorId: parseInt(doctorId),
            assignedAt: new Date()
          },
          include: {
            customer: true,
            assignedDoctor: true
          }
        });
        
        // Note: History form will be created manually by the doctor
        
        return { updatedAppointment, historyFormId: appointment.historyForm?.id || null };
      });
      
      // Prepare links - prescription form will only be available after history form is submitted
      const baseUrl = 'https://www.animalwellness.shop';
      const links = {
        historyForm: `${baseUrl}/historyform?appointmentId=${appointmentId}`,
        prescriptionForm: result.historyFormId ? `${baseUrl}/prescriptionform?historyFormId=${result.historyFormId}` : null
      };
      
      // Send full details email with both form links to doctor
      const confirmationEmail = getAcceptanceConfirmationEmail(doctor, appointment, links);
      
      await transporter.sendMail({
        from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
        to: doctor.partnerEmail,
        ...confirmationEmail
      });
      
      // Send notification email to patient
      console.log('=== PATIENT EMAIL DEBUG ===');
      console.log('appointment.customer:', appointment.customer);
      console.log('appointment.customer?.email:', appointment.customer?.email);
      console.log('appointmentId:', appointmentId);
      console.log('doctor:', {
        name: doctor.partnerName,
        email: doctor.partnerEmail
      });
      
      if (appointment.customer?.email) {
        try {
          console.log(`Attempting to send patient email to: ${appointment.customer.email}`);
          
          const patientEmail = getPatientDoctorAssignmentEmail(appointment, doctor);
          
          console.log('Email template generated:', {
            subject: patientEmail.subject,
            to: appointment.customer.email,
            from: `"Animal Wellness Service" <${process.env.EMAIL_USER}>`
          });
          
          const emailResult = await transporter.sendMail({
            from: `"Animal Wellness Service" <${process.env.EMAIL_USER}>`,
            to: appointment.customer.email,
            ...patientEmail
          });
          
          console.log(`✅ Patient notification sent successfully!`);
          console.log('Email result:', emailResult);
        } catch (patientEmailError) {
          console.error('❌ Failed to send patient notification email:', patientEmailError);
          console.error('Error details:', {
            message: patientEmailError.message,
            code: patientEmailError.code,
            stack: patientEmailError.stack
          });
          // Don't fail the entire process if patient email fails
        }
      } else {
        console.log('❌ No patient email available for notification');
        console.log('Customer data:', appointment.customer);
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
        await transporter.sendMail({
          from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
          to: otherDoc.partnerEmail,
          ...caseTakenEmail
        });
      }
      
      // Return success page
      return new NextResponse(
        `<html><body style="font-family: Arial; padding: 50px; text-align: center;">
          <h2 style="color: #22c55e;">✅ Case Accepted Successfully!</h2>
          <p>Thank you, Dr. ${doctor.partnerName}!</p>
          <p>Patient details have been sent to your email:</p>
          <ul style="text-align: left; display: inline-block;">
            <li>📝 History Form - Please complete first for patient examination</li>
            <li>💊 Prescription Form - Available after history form submission</li>
          </ul>
          <p><strong>Owner Contact:</strong> ${appointment.doctor}</p>
          <p style="margin-top: 30px; color: #666;">Please start with the History Form. The Prescription Form link will be provided after the history form is completed.</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
      
    } else {
      // Doctor declined
      return new NextResponse(
        `<html><body style="font-family: Arial; padding: 50px; text-align: center;">
          <h2>Thank You</h2>
          <p>We've noted that you're not available for this case.</p>
          <p>We'll notify you of future cases in your area.</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
  } catch (error) {
    console.error('Error handling acceptance:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}