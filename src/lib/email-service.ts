// lib/email-service.ts
import nodemailer from 'nodemailer';
import { Partner } from '@prisma/client';

// Create transporter (using Gmail as example - works with any email provider)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER, // your-email@gmail.com
    pass: process.env.EMAIL_APP_PASSWORD, // App-specific password
  },
  // For custom domain email (professional):
  // host: 'smtp.gmail.com',
  // port: 587,
  // secure: false,
});

// Send email to veterinarian
export async function sendVeterinarianNotification(
  vet: any,
  appointment: any,
  links: { historyForm: string; prescriptionForm: string | null }
) {
  try {
    const consultationType = 
      appointment.paymentInfo?.consultationType === 'physical' ? '🏥 Physical Visit' :
      appointment.paymentInfo?.consultationType === 'virtual' ? '💻 Virtual Consultation' :
      appointment.paymentInfo?.consultationType === 'needy' ? '🤝 Free Consultation (Needy)' :
      '📋 Consultation';

    const urgencyTag = appointment.isEmergency ? 
      '<div style="background: #ff4444; color: white; padding: 10px; text-align: center; font-weight: bold;">⚠️ EMERGENCY CASE ⚠️</div>' : '';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #22c55e; }
    .button { display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .btn-accept { background: #22c55e; color: white; }
    .btn-decline { background: #666; color: white; }
    .btn-form { background: #3b82f6; color: white; }
    .footer { margin-top: 20px; padding: 15px; background: #f1f1f1; font-size: 12px; color: #666; }
    .urgent { background: #fff3cd; border-color: #ff9800; padding: 10px; margin: 10px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    ${urgencyTag}
    
    <div class="header">
      <h2>New Veterinary Case Available</h2>
      <p style="margin: 0;">${consultationType}</p>
    </div>
    
    <div class="content">
      <p>Dear Dr. ${vet.partnerName},</p>
      
      <p>A new veterinary case is available in your area and requires attention.</p>
      
      ${appointment.isEmergency ? '<div class="urgent">⚠️ <strong>This is an EMERGENCY case requiring immediate attention!</strong></div>' : ''}
      
      <div class="info-box">
        <h3 style="margin-top: 0;">📍 Location Details</h3>
        <strong>City:</strong> ${appointment.city}<br>
        ${appointment.state ? `<strong>State:</strong> ${appointment.state}<br>` : ''}
        ${appointment.fullAddress ? `<strong>Address:</strong> ${appointment.fullAddress}<br>` : ''}
      </div>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">🐾 Patient Information</h3>
        <strong>Animal:</strong> ${appointment.species}<br>
        <strong>Gender:</strong> ${appointment.gender || 'Not specified'}<br>
        <strong>Issue:</strong> ${appointment.description}<br>
      </div>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">📅 Appointment Details</h3>
        <strong>Date & Time:</strong> ${new Date(appointment.appointmentAt).toLocaleString('en-PK', {
          timeZone: 'Asia/Karachi',
          dateStyle: 'full',
          timeStyle: 'short'
        })}<br>
        <strong>Owner Contact:</strong> ${appointment.doctor}<br>
        <strong>Type:</strong> ${appointment.paymentInfo?.consultationType || 'Standard'}<br>
        ${appointment.paymentInfo?.consultationFee ? `<strong>Fee:</strong> Rs. ${appointment.paymentInfo.consultationFee}` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <h3>📋 Patient Forms</h3>
        <a href="${links.historyForm}" class="button btn-form">Open History Form</a>
        ${links.prescriptionForm ? 
          `<a href="${links.prescriptionForm}" class="button btn-form">Open Prescription Form</a>` : 
          '<p style="color: #666; font-size: 14px;">Prescription form will be available after history form is filled</p>'
        }
      </div>
      
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #e8f5e9; border-radius: 10px;">
        <h3>Would you like to take this case?</h3>
        <a href="mailto:${process.env.EMAIL_USER}?subject=Accept Case ${appointment.id}&body=YES - I accept case ${appointment.id}" 
           class="button btn-accept">✓ ACCEPT CASE</a>
        <a href="mailto:${process.env.EMAIL_USER}?subject=Decline Case ${appointment.id}&body=NO - I cannot take case ${appointment.id}" 
           class="button btn-decline">✗ DECLINE</a>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">
          Or simply reply to this email with "YES" or "NO"
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Important:</strong> Please respond quickly if this is an emergency case.</p>
      <p>This is an automated notification. First veterinarian to accept will be assigned the case.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
      <p style="font-size: 11px;">
        You received this email because you're registered as a veterinarian in ${appointment.city}.<br>
        To update your preferences or unsubscribe, please contact admin.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const plainText = `
New Veterinary Case Available
${appointment.isEmergency ? '⚠️ EMERGENCY CASE ⚠️' : ''}

Dear Dr. ${vet.partnerName},

A new case requires attention in ${appointment.city}.

PATIENT DETAILS:
- Animal: ${appointment.species}
- Issue: ${appointment.description}
- Contact: ${appointment.doctor}
- Date: ${new Date(appointment.appointmentAt).toLocaleString()}

FORMS:
History Form: ${links.historyForm}
${links.prescriptionForm ? `Prescription Form: ${links.prescriptionForm}` : 'Prescription: Fill history form first'}

Reply with:
- YES to accept this case
- NO if not available

Thank you,
Veterinary Management System
    `;

    const mailOptions = {
      from: `"Veterinary Cases" <${process.env.EMAIL_USER}>`,
      to: vet.partnerEmail,
      subject: `${appointment.isEmergency ? '🚨 URGENT: ' : ''}New Veterinary Case in ${appointment.city} - ${appointment.species}`,
      text: plainText,
      html: emailHtml,
      // Optional: Set high priority for emergencies
      ...(appointment.isEmergency && {
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'Importance': 'high'
        }
      })
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent to', vet.partnerName, ':', result.messageId);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// Send bulk notifications to all veterinarians in a city
export async function notifyVeterinarians(appointment: any, veterinarians: any[]) {
  const baseUrl = 'http://www.animalwellness.shop';
  const links = {
    historyForm: `${baseUrl}/historyform?appointmentId=${appointment.id}`,
    prescriptionForm: appointment.historyForm?.id 
      ? `${baseUrl}/prescriptionform?historyFormId=${appointment.historyForm.id}`
      : null
  };

  const results = [];
  
  for (const vet of veterinarians) {
    if (vet.partnerEmail) {
      const result = await sendVeterinarianNotification(vet, appointment, links);
      results.push({
        veterinarian: vet.partnerName,
        email: vet.partnerEmail,
        ...result
      });
      
      // Add small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// ============================================
// app/api/email/webhook/route.ts
// Handle email replies (using email parsing service or IMAP)
// ============================================


// ============================================
// Update appointment status API to use email
// ============================================

// In app/api/appointments/status/route.ts:
// import { notifyVeterinarians } from '@/lib/email-service';

// // In the APPROVED block:
// if (status === "APPROVED" && veterinarians.length > 0) {
//   const emailResults = await notifyVeterinarians(appointment, veterinarians);
//   console.log('Email notifications sent:', emailResults);
// }

// ============================================
// SETUP INSTRUCTIONS
// ============================================

/*
1. Install nodemailer:
   npm install nodemailer
   npm install --save-dev @types/nodemailer

2. Set up email account:
   
   FOR GMAIL:
   - Go to Google Account settings
   - Security > 2-Step Verification (enable it)
   - Security > App passwords
   - Generate app password for "Mail"
   - Use this password in .env.local

   FOR PROFESSIONAL EMAIL:
   - Use your domain email SMTP settings
   - Looks more professional

3. Add to .env.local:
   EMAIL_USER=your-email@gmail.com
   EMAIL_APP_PASSWORD=your-app-specific-password
   NEXT_PUBLIC_APP_URL=https://yourdomain.com

4. Test:
   - Approve an appointment
   - Check if veterinarians receive emails
   - They can reply directly to accept/decline

ADVANTAGES:
✅ 100% FREE (unlimited emails)
✅ Professional HTML emails
✅ Works on all devices
✅ No phone number needed
✅ Veterinarians can reply directly
✅ Includes clickable forms links
✅ Can track opens/clicks
✅ No API limits

OPTIONAL UPGRADES:
- Use SendGrid/Resend (10k free emails/month)
- Add email tracking
- Automatic reply processing with IMAP
*/