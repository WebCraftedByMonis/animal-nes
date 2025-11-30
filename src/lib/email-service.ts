// lib/email-service.ts
import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// PHASE 1: Initial notification - LIMITED INFO (no phone/address)
export async function sendInitialNotification(
  vet: any,
  appointment: any,
  acceptLink: string,
  declineLink: string
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
      
      <p>A new veterinary case is available in <strong>${appointment.city}</strong>.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">🐾 Case Summary</h3>
        <strong>Animal:</strong> ${appointment.species}<br>
        <strong>Issue:</strong> ${appointment.description}<br>
        <strong>City:</strong> ${appointment.city}<br>
        <strong>Type:</strong> ${consultationType}<br>
        ${appointment.isEmergency ? '<strong style="color: red;">⚠️ EMERGENCY CASE</strong><br>' : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #e8f5e9; border-radius: 10px;">
        <h3>Are you available for this case?</h3>
        <a href="${acceptLink}" class="button btn-accept">✓ YES, I'M AVAILABLE</a>
        <a href="${declineLink}" class="button btn-decline">✗ NOT AVAILABLE</a>
      </div>
      
      <p style="text-align: center; color: #666;">
        <small>First doctor to accept will receive full patient details and contact information</small>
      </p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Veterinary Cases" <${process.env.EMAIL_USER}>`,
      to: vet.partnerEmail,
      subject: `${appointment.isEmergency ? '🚨 URGENT: ' : ''}New Case - ${appointment.species} in ${appointment.city}`,
      html: emailHtml,
      text: `New case: ${appointment.species} with ${appointment.description} in ${appointment.city}. Click to accept or decline.`,
      ...(appointment.isEmergency && {
        priority: 'high',
        headers: { 'X-Priority': '1', 'Importance': 'high' }
      })
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending initial notification:', error);
    return { success: false, error };
  }
}

// PHASE 2: Send full details to accepting doctor
export async function sendAcceptanceConfirmation(
  vet: any,
  appointment: any,
  links: { historyForm: string; prescriptionForm: string | null }
) {
  try {
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
    .btn-form { background: #3b82f6; color: white; }
    .success { background: #d4edda; border-color: #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ Case Assigned to You</h2>
    </div>
    
    <div class="content">
      <div class="success">
        <strong>Thank you, Dr. ${vet.partnerName}!</strong><br>
        You have been assigned this case. Full patient details are below.
      </div>
      
      <div class="info-box" style="background: #fff3cd; border-color: #ff9800;">
        <h3>📱 OWNER CONTACT (Private Information)</h3>
        <strong style="font-size: 18px; color: #d32f2f;">Phone: ${appointment.doctor}</strong><br>
        <strong>Name:</strong> ${appointment.customer?.name || 'Not provided'}<br>
        <strong>Email:</strong> ${appointment.customer?.email || 'Not provided'}
      </div>
      
      <div class="info-box">
        <h3>📍 Full Location Details</h3>
        <strong>City:</strong> ${appointment.city}<br>
        ${appointment.state ? `<strong>State:</strong> ${appointment.state}<br>` : ''}
        ${appointment.fullAddress ? `<strong>Full Address:</strong> ${appointment.fullAddress}<br>` : ''}
      </div>
      
      <div class="info-box">
        <h3>🐾 Complete Patient Information</h3>
        <strong>Animal:</strong> ${appointment.species}<br>
        <strong>Gender:</strong> ${appointment.gender || 'Not specified'}<br>
        <strong>Issue:</strong> ${appointment.description}<br>
        <strong>Appointment Time:</strong> ${new Date(appointment.appointmentAt).toLocaleString('en-PK', {
          timeZone: 'Asia/Karachi',
          dateStyle: 'full',
          timeStyle: 'short'
        })}<br>
        ${appointment.isEmergency ? '<strong style="color: red;">⚠️ EMERGENCY - Immediate attention required</strong><br>' : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #fff3cd; border-radius: 10px;">
        <h3>📋 Patient Forms</h3>
        <a href="${links.historyForm}" class="button btn-form">📝 Fill History Form</a>
        ${links.prescriptionForm ? 
          `<a href="${links.prescriptionForm}" class="button btn-form">💊 Fill Prescription Form</a>` : 
          '<p style="color: #666;">Prescription form available after history form</p>'
        }
      </div>
      
      <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
        <strong>Next Steps:</strong>
        <ol>
          <li>Contact owner at <strong>${appointment.doctor}</strong></li>
          <li>Fill history form with examination details</li>
          <li>Provide prescription if needed</li>
        </ol>
      </div>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
      to: vet.partnerEmail,
      subject: `✅ Case Assigned - ${appointment.species} - Contact: ${appointment.doctor}`,
      html: emailHtml,
      text: `Case assigned. Owner contact: ${appointment.doctor}. Check email for full details.`
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending confirmation:', error);
    return { success: false, error };
  }
}

// PHASE 3: Notify other doctors that case is taken
export async function sendCaseTakenNotification(
  vet: any,
  appointment: any,
  acceptedByDoctor: string
) {
  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6c757d; color: white; padding: 20px; border-radius: 10px; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Case Already Assigned</h2>
    </div>
    <div class="content">
      <p>Dear Dr. ${vet.partnerName},</p>
      <p>The case for <strong>${appointment.species}</strong> in <strong>${appointment.city}</strong> has been accepted by <strong>Dr. ${acceptedByDoctor}</strong>.</p>
      <p>Thank you for your availability. We'll notify you of future cases in your area.</p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
      to: vet.partnerEmail,
      subject: `Case Taken - ${appointment.species} in ${appointment.city}`,
      html: emailHtml,
      text: `The case has been accepted by Dr. ${acceptedByDoctor}. Thank you for your availability.`
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending case taken notification:', error);
    return { success: false, error };
  }
}

// Main function to notify all veterinarians (PHASE 1 only)
export async function notifyVeterinarians(appointment: any, veterinarians: any[]) {
  const baseUrl = 'http://www.animalwellness.shop';
  const results = [];

  for (const vet of veterinarians) {
    if (vet.partnerEmail) {
      // Create unique accept/decline links for each doctor
      const acceptLink = `${baseUrl}/api/appointments/accept?appointmentId=${appointment.id}&doctorId=${vet.id}&action=accept`;
      const declineLink = `${baseUrl}/api/appointments/accept?appointmentId=${appointment.id}&doctorId=${vet.id}&action=decline`;

      // Send only basic info (Phase 1)
      const result = await sendInitialNotification(vet, appointment, acceptLink, declineLink);

      results.push({
        veterinarian: vet.partnerName,
        email: vet.partnerEmail,
        ...result
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Master Trainer Program - Approval Email
export async function sendMasterTrainerApproval(registration: any) {
  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .header { background-color: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .info-box { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; }
    .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Your Registration has been Approved</p>
    </div>

    <div class="content">
      <p style="font-size: 16px; color: #333;">Dear <strong>${registration.name}</strong>,</p>

      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        We are pleased to inform you that your registration for the <strong>Master Trainer Program</strong> has been approved!
      </p>

      <div class="info-box">
        <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 16px;">Program Details</h3>
        <p style="margin: 5px 0; color: #555;"><strong>Event Timing:</strong> November 29 - December 14, 2025</p>
        <p style="margin: 5px 0; color: #555;"><strong>Zoom Link:</strong></p>
        <a href="https://us05web.zoom.us/j/82580834219?pwd=wHuWFJ7oZCnsHcuiRykOiCOrXbCdjn.1"
           style="color: #2563eb; word-break: break-all; font-size: 13px;">
           https://us05web.zoom.us/j/82580834219?pwd=wHuWFJ7oZCnsHcuiRykOiCOrXbCdjn.1
        </a>
      </div>

      <div class="warning-box">
        <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">Important Information</h3>
        <ul style="margin: 10px 0; padding-left: 20px; color: #555;">
          <li style="margin: 5px 0;">Please join the Zoom meeting 10 minutes before the session starts</li>
          <li style="margin: 5px 0;">Keep your camera on during the sessions</li>
          <li style="margin: 5px 0;">Prepare notebooks and materials for taking notes</li>
          <li style="margin: 5px 0;">Active participation is encouraged</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        If you have any questions or need further assistance, please don't hesitate to contact us.
      </p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Contact Us:</strong></p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">📞 Phone: (+92) 335-4145431</p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">📧 Email: animalwellnessshop@gmail.com</p>
      </div>

      <div style="margin-top: 30px; text-align: center;">
        <p style="color: #22c55e; font-size: 16px; font-weight: bold;">We look forward to seeing you in the program!</p>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>Animal Wellness Shop © 2025. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Animal Wellness Shop" <${process.env.EMAIL_USER}>`,
      to: registration.email,
      subject: 'Master Trainer Program - Registration Approved ✅',
      html: emailHtml,
      text: `Dear ${registration.name}, Your registration for the Master Trainer Program has been approved! Event Timing: November 29 - December 14, 2025. Zoom Link: https://us05web.zoom.us/j/82580834219?pwd=wHuWFJ7oZCnsHcuiRykOiCOrXbCdjn.1`
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending master trainer approval:', error);
    return { success: false, error };
  }
}