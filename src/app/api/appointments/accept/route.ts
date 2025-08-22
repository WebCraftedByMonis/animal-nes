// src/app/api/appointments/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { getAcceptanceConfirmationEmail, getCaseTakenEmail } from '@/lib/email-templates';

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
        
        // 2. Create history form if it doesn't exist
        let historyForm = appointment.historyForm;
        if (!historyForm) {
          const newHistoryForm = await tx.historyForm.create({
            data: {
              appointmentId: parseInt(appointmentId),
              name: appointment.customer.name || '',
              contact: appointment.doctor, // phone number from appointment
              address: appointment.fullAddress || `${appointment.city}, ${appointment.state || ''}`,
              animalSpecie: appointment.species,
              breed: '',
              age: '',
              sex: appointment.gender === 'MALE' ? 'Male' : 'Female',
              mainIssue: appointment.description,
              duration: '',
              examinedBy: doctor.partnerName || '',
              examinationDate: appointment.appointmentAt
            }
          });
          historyForm = { id: newHistoryForm.id };
        }
        
        return { updatedAppointment, historyFormId: historyForm.id };
      });
      
      // Prepare links with both forms
      const baseUrl = 'https://www.animalwellness.shop';
      const links = {
        historyForm: `${baseUrl}/historyform?appointmentId=${appointmentId}`,
        prescriptionForm: `${baseUrl}/prescriptionform?historyFormId=${result.historyFormId}` // Now we always have historyFormId
      };
      
      // Send full details email with both form links
      const confirmationEmail = getAcceptanceConfirmationEmail(doctor, appointment, links);
      
      await transporter.sendMail({
        from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
        to: doctor.partnerEmail,
        ...confirmationEmail
      });
      
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
      
      // Return success page with both forms mentioned
      return new NextResponse(
        `<html><body style="font-family: Arial; padding: 50px; text-align: center;">
          <h2 style="color: #22c55e;">✅ Case Accepted Successfully!</h2>
          <p>Thank you, Dr. ${doctor.partnerName}!</p>
          <p>Full patient details and forms have been sent to your email:</p>
          <ul style="text-align: left; display: inline-block;">
            <li>📝 History Form - for examination details</li>
            <li>💊 Prescription Form - for treatment plan</li>
          </ul>
          <p><strong>Owner Contact:</strong> ${appointment.doctor}</p>
          <p style="margin-top: 30px; color: #666;">Please check your email for complete information and direct links to both forms.</p>
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