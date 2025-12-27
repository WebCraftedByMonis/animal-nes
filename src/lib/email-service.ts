// lib/email-service.ts
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { EmailType, EmailStatus } from '@prisma/client';

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
  console.error('CRITICAL: EMAIL_USER and EMAIL_APP_PASSWORD must be set in environment variables');
  console.error('Email service will not function without these credentials');
}

// Gmail rate limiting (500/day for free accounts, 2000/day for paid)
const GMAIL_DAILY_LIMIT = parseInt(process.env.GMAIL_DAILY_LIMIT || '500');
let emailsSentToday = 0;
let lastResetDate = new Date().toDateString();

function checkRateLimit(): { allowed: boolean; remaining: number } {
  const today = new Date().toDateString();

  // Reset counter if it's a new day
  if (today !== lastResetDate) {
    emailsSentToday = 0;
    lastResetDate = today;
  }

  const remaining = GMAIL_DAILY_LIMIT - emailsSentToday;
  return {
    allowed: emailsSentToday < GMAIL_DAILY_LIMIT,
    remaining: Math.max(0, remaining)
  };
}

function incrementEmailCount() {
  emailsSentToday++;
}

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Email logging function
async function logEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  recipientType: string;
  subject: string;
  emailType: EmailType;
  status: EmailStatus;
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
    // Don't throw - we don't want logging failures to stop email sending
  }
}

// PHASE 1: Initial notification - LIMITED INFO (no phone/address)
export async function sendInitialNotification(
  vet: any,
  appointment: any,
  acceptLink: string,
  declineLink: string
) {
  const emailSubject = `${appointment.isEmergency ? '🚨 URGENT: ' : ''}New Case - ${appointment.species} in ${appointment.city}`;

  // Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.error(`Gmail rate limit reached (${GMAIL_DAILY_LIMIT}/day). ${rateLimit.remaining} emails remaining today.`);

    await logEmail({
      recipientEmail: vet.partnerEmail,
      recipientName: vet.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'INITIAL_NOTIFICATION',
      status: 'FAILED',
      errorMessage: `Rate limit exceeded: ${GMAIL_DAILY_LIMIT} emails/day limit reached`,
      appointmentId: appointment.id,
      partnerId: vet.id,
    });

    return { success: false, error: 'Rate limit exceeded', remaining: rateLimit.remaining };
  }

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
      subject: emailSubject,
      html: emailHtml,
      text: `New case: ${appointment.species} with ${appointment.description} in ${appointment.city}. Click to accept or decline.`,
      ...(appointment.isEmergency && {
        priority: 'high',
        headers: { 'X-Priority': '1', 'Importance': 'high' }
      })
    };

    const result = await transporter.sendMail(mailOptions);

    // Increment email count
    incrementEmailCount();

    // Log successful email
    await logEmail({
      recipientEmail: vet.partnerEmail,
      recipientName: vet.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'INITIAL_NOTIFICATION',
      status: 'SENT',
      appointmentId: appointment.id,
      partnerId: vet.id,
      metadata: {
        consultationType: appointment.paymentInfo?.consultationType,
        isEmergency: appointment.isEmergency,
        species: appointment.species,
        city: appointment.city,
      },
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending initial notification:', error);

    // Log failed email
    await logEmail({
      recipientEmail: vet.partnerEmail,
      recipientName: vet.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'INITIAL_NOTIFICATION',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      appointmentId: appointment.id,
      partnerId: vet.id,
    });

    return { success: false, error };
  }
}

// PHASE 2: Send full details to accepting doctor
export async function sendAcceptanceConfirmation(
  vet: any,
  appointment: any,
  historyFormLink: string
) {
  const emailSubject = `✅ Case Assigned - ${appointment.species} - Contact: ${appointment.doctor}`;

  // Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.error(`Gmail rate limit reached (${GMAIL_DAILY_LIMIT}/day).`);
    await logEmail({
      recipientEmail: vet.partnerEmail,
      recipientName: vet.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'ACCEPTANCE_CONFIRMATION',
      status: 'FAILED',
      errorMessage: `Rate limit exceeded: ${GMAIL_DAILY_LIMIT} emails/day limit reached`,
      appointmentId: appointment.id,
      partnerId: vet.id,
    });
    return { success: false, error: 'Rate limit exceeded' };
  }

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
        <h3>📋 Next Step: Fill History Form</h3>
        <p style="color: #666; margin: 10px 0;">After completing the history form, you'll receive a link to the prescription form.</p>
        <a href="${historyFormLink}" class="button btn-form">📝 Fill History Form Now</a>
      </div>

      <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
        <strong>Next Steps:</strong>
        <ol>
          <li>Contact owner at <strong>${appointment.doctor}</strong></li>
          <li>Fill history form with examination details</li>
          <li>Complete prescription form (link will be sent after history form)</li>
        </ol>
      </div>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
      to: vet.partnerEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `Case assigned. Owner contact: ${appointment.doctor}. Check email for full details.`
    };

    const result = await transporter.sendMail(mailOptions);

    // Increment email count
    incrementEmailCount();

    // Log successful email
    await logEmail({
      recipientEmail: vet.partnerEmail,
      recipientName: vet.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'ACCEPTANCE_CONFIRMATION',
      status: 'SENT',
      appointmentId: appointment.id,
      partnerId: vet.id,
      metadata: {
        ownerPhone: appointment.doctor,
        species: appointment.species,
        city: appointment.city,
      },
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending confirmation:', error);

    // Log failed email
    await logEmail({
      recipientEmail: vet.partnerEmail,
      recipientName: vet.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'ACCEPTANCE_CONFIRMATION',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      appointmentId: appointment.id,
      partnerId: vet.id,
    });

    return { success: false, error };
  }
}

// PHASE 3: Notify other doctors that case is taken
export async function sendCaseTakenNotification(
  vet: any,
  appointment: any,
  acceptedByDoctor: string
) {
  const emailSubject = `Case Taken - ${appointment.species} in ${appointment.city}`;

  // Check rate limit (less critical, so just log warning and skip)
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.warn(`Gmail rate limit reached. Skipping case-taken notification to ${vet.partnerEmail}`);
    return { success: false, error: 'Rate limit exceeded', skipped: true };
  }

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
      subject: emailSubject,
      html: emailHtml,
      text: `The case has been accepted by Dr. ${acceptedByDoctor}. Thank you for your availability.`
    };

    await transporter.sendMail(mailOptions);

    // Increment email count
    incrementEmailCount();

    // Log successful email
    await logEmail({
      recipientEmail: vet.partnerEmail,
      recipientName: vet.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'CASE_TAKEN',
      status: 'SENT',
      appointmentId: appointment.id,
      partnerId: vet.id,
      metadata: {
        acceptedByDoctor,
        species: appointment.species,
        city: appointment.city,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending case taken notification:', error);

    // Log failed email
    await logEmail({
      recipientEmail: vet.partnerEmail,
      recipientName: vet.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'CASE_TAKEN',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      appointmentId: appointment.id,
      partnerId: vet.id,
    });

    return { success: false, error };
  }
}

// Send prescription form link after history form submission
export async function sendPrescriptionFormLink(
  doctor: any,
  historyFormId: number,
  appointmentId: number
) {
  const emailSubject = 'History Form Completed - Please Fill Prescription';

  // Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.error(`Gmail rate limit reached (${GMAIL_DAILY_LIMIT}/day).`);
    return { success: false, error: 'Rate limit exceeded' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.animalwellness.shop';
    const prescriptionLink = `${baseUrl}/prescriptionform?historyFormId=${historyFormId}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 30px; margin: 20px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; background: #9333ea; color: white; }
    .success { background: #d4edda; border-color: #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ History Form Completed</h2>
    </div>

    <div class="content">
      <div class="success">
        <strong>Great job, Dr. ${doctor.partnerName}!</strong><br>
        The history form has been successfully submitted.
      </div>

      <h3>📋 Next Step: Complete Prescription Form</h3>
      <p>Please provide the prescription details for this patient to complete the treatment plan.</p>

      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f3e8ff; border-radius: 10px;">
        <a href="${prescriptionLink}" class="button">💊 Fill Prescription Form</a>
      </div>

      <p style="color: #666; font-size: 14px;">
        This link will take you directly to the prescription form with pre-filled patient information.
      </p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Veterinary System" <${process.env.EMAIL_USER}>`,
      to: doctor.partnerEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `History form completed! Please fill the prescription form: ${prescriptionLink}`
    };

    const result = await transporter.sendMail(mailOptions);

    // Increment email count
    incrementEmailCount();

    // Log successful email
    await logEmail({
      recipientEmail: doctor.partnerEmail,
      recipientName: doctor.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'SENT',
      appointmentId: appointmentId,
      partnerId: doctor.id,
      metadata: {
        historyFormId,
        prescriptionLink
      },
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending prescription form link:', error);

    await logEmail({
      recipientEmail: doctor.partnerEmail,
      recipientName: doctor.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      appointmentId: appointmentId,
      partnerId: doctor.id,
    });

    return { success: false, error };
  }
}

// Send prescription completion email to patient with vet profile link
export async function sendPrescriptionCompletionToPatient(
  patient: { email: string; name: string },
  doctor: any,
  prescription: any
) {
  const emailSubject = `✅ Prescription Ready - Treatment Plan from Dr. ${doctor.partnerName}`;

  // Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.error(`Gmail rate limit reached (${GMAIL_DAILY_LIMIT}/day).`);
    return { success: false, error: 'Rate limit exceeded' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.animalwellness.shop';
    const vetProfileLink = `${baseUrl}/Veternarians/${doctor.id}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .doctor-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border-left: 4px solid #22c55e; }
    .button { display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; background: #22c55e; color: white; }
    .review-box { background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🩺 Your Prescription is Ready!</h2>
    </div>

    <div class="content">
      <p>Dear ${patient.name},</p>

      <p>Great news! Dr. ${doctor.partnerName} has completed your prescription and treatment plan for your ${prescription.animalSpecies}.</p>

      <div class="doctor-box">
        <h3 style="margin-top: 0; color: #22c55e;">👨‍⚕️ Your Veterinarian</h3>
        <h4 style="margin: 10px 0;">Dr. ${doctor.partnerName}</h4>
        ${doctor.qualificationDegree ? `<p style="margin: 5px 0; color: #666;">${doctor.qualificationDegree}</p>` : ''}
        ${doctor.specialization ? `<p style="margin: 5px 0;"><strong>Specialization:</strong> ${doctor.specialization}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Clinic:</strong> ${doctor.shopName || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> ${doctor.cityName}${doctor.state ? `, ${doctor.state}` : ''}</p>
        ${doctor.partnerMobileNumber ? `<p style="margin: 5px 0;"><strong>Contact:</strong> ${doctor.partnerMobileNumber}</p>` : ''}

        <div style="text-align: center; margin-top: 20px;">
          <a href="${vetProfileLink}" class="button">View Doctor's Full Profile</a>
        </div>
      </div>

      <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="margin-top: 0;">📋 Prescription Details</h4>
        <p><strong>Animal:</strong> ${prescription.animalSpecies}</p>
        <p><strong>Owner:</strong> ${prescription.ownerName}</p>
        ${prescription.diagnosis ? `<p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>` : ''}
        <p style="font-size: 14px; color: #666; margin-top: 15px;">
          Please follow the prescribed treatment plan carefully. If you have any questions, contact Dr. ${doctor.partnerName} directly.
        </p>
      </div>

      <div class="review-box">
        <h4 style="margin-top: 0; color: #d97706;">⭐ How was your experience?</h4>
        <p>After your animal's treatment, we'd love to hear your feedback! Your review helps other pet owners find quality veterinary care.</p>
        <p style="font-size: 14px; color: #666; margin-top: 10px;">
          <em>You can leave a review on the doctor's profile page within the next few days.</em>
        </p>
      </div>

      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
        Wishing your animal a speedy recovery! 🐾
      </p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Animal Wellness Service" <${process.env.EMAIL_USER}>`,
      to: patient.email,
      subject: emailSubject,
      html: emailHtml,
      text: `Your prescription is ready from Dr. ${doctor.partnerName}. View the doctor's profile: ${vetProfileLink}`
    };

    const result = await transporter.sendMail(mailOptions);

    // Increment email count
    incrementEmailCount();

    // Log successful email
    await logEmail({
      recipientEmail: patient.email,
      recipientName: patient.name,
      recipientType: 'PATIENT',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'SENT',
      partnerId: doctor.id,
      metadata: {
        prescriptionId: prescription.id,
        doctorName: doctor.partnerName,
        vetProfileLink
      },
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending prescription completion email to patient:', error);

    await logEmail({
      recipientEmail: patient.email,
      recipientName: patient.name,
      recipientType: 'PATIENT',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      partnerId: doctor.id,
    });

    return { success: false, error };
  }
}

// Main function to notify all veterinarians (PHASE 1 only)
export async function notifyVeterinarians(appointment: any, veterinarians: any[]) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.animalwellness.shop';
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
  const emailSubject = 'Master Trainer Program - Registration Approved ✅';

  // Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.error(`Gmail rate limit reached (${GMAIL_DAILY_LIMIT}/day).`);
    await logEmail({
      recipientEmail: registration.email,
      recipientName: registration.name,
      recipientType: 'MASTER_TRAINER',
      subject: emailSubject,
      emailType: 'MASTER_TRAINER_APPROVAL',
      status: 'FAILED',
      errorMessage: `Rate limit exceeded: ${GMAIL_DAILY_LIMIT} emails/day limit reached`,
    });
    return { success: false, error: 'Rate limit exceeded' };
  }

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
      subject: emailSubject,
      html: emailHtml,
      text: `Dear ${registration.name}, Your registration for the Master Trainer Program has been approved! Event Timing: November 29 - December 14, 2025. Zoom Link: https://us05web.zoom.us/j/82580834219?pwd=wHuWFJ7oZCnsHcuiRykOiCOrXbCdjn.1`
    };

    const result = await transporter.sendMail(mailOptions);

    // Increment email count
    incrementEmailCount();

    // Log successful email
    await logEmail({
      recipientEmail: registration.email,
      recipientName: registration.name,
      recipientType: 'MASTER_TRAINER',
      subject: emailSubject,
      emailType: 'MASTER_TRAINER_APPROVAL',
      status: 'SENT',
      metadata: {
        whatsappNumber: registration.whatsappNumber,
        address: registration.address,
      },
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending master trainer approval:', error);

    // Log failed email
    await logEmail({
      recipientEmail: registration.email,
      recipientName: registration.name,
      recipientType: 'MASTER_TRAINER',
      subject: emailSubject,
      emailType: 'MASTER_TRAINER_APPROVAL',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return { success: false, error };
  }
}

// Send review notification to doctor when they receive a review
export async function sendReviewNotificationToDoctor(
  doctor: any,
  review: any
) {
  const emailSubject = `New Review Received - ${review.rating} Star${review.rating > 1 ? 's' : ''}`;

  // Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.error(`Gmail rate limit reached (${GMAIL_DAILY_LIMIT}/day).`);
    await logEmail({
      recipientEmail: doctor.partnerEmail,
      recipientName: doctor.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'FAILED',
      errorMessage: `Rate limit exceeded: ${GMAIL_DAILY_LIMIT} emails/day limit reached`,
      partnerId: doctor.id,
    });
    return { success: false, error: 'Rate limit exceeded' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.animalwellness.shop';
  const dashboardLink = `${baseUrl}/partner/dashboard`;

  // Create star rating display
  const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .header { background-color: #7c3aed; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .review-box { background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #7c3aed; }
    .button { display: inline-block; padding: 12px 30px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">New Review Received</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">You have a new patient review!</p>
    </div>

    <div class="content">
      <p style="font-size: 16px; color: #333;">Dear <strong>Dr. ${doctor.partnerName}</strong>,</p>

      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Great news! You've received a new review from a patient.
      </p>

      <div class="review-box">
        <div style="text-align: center; margin-bottom: 15px;">
          <div style="font-size: 32px; margin-bottom: 10px;">${stars}</div>
          <div style="font-size: 18px; color: #7c3aed; font-weight: bold;">${review.rating} out of 5 stars</div>
        </div>

        <div style="margin-top: 20px;">
          <p style="margin: 5px 0; color: #666;"><strong>From:</strong> ${review.user?.name || 'Anonymous'}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(review.createdAt).toLocaleDateString()}</p>
        </div>

        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="margin: 0 0 10px 0; color: #666; font-weight: bold;">Review:</p>
          <p style="margin: 0; color: #333; font-style: italic; line-height: 1.6;">
            "${review.comment}"
          </p>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardLink}" class="button">View All Reviews</a>
      </div>

      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Patient reviews help build trust and attract more clients. Keep up the excellent work!
      </p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Contact Us:</strong></p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">📞 Phone: (+92) 335-4145431</p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">📧 Email: animalwellnessshop@gmail.com</p>
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
      to: doctor.partnerEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `Dear Dr. ${doctor.partnerName}, You received a new ${review.rating}-star review from ${review.user?.name || 'a patient'}. Review: "${review.comment}". View all your reviews at ${dashboardLink}`
    };

    const result = await transporter.sendMail(mailOptions);

    // Increment email count
    incrementEmailCount();

    // Log successful email
    await logEmail({
      recipientEmail: doctor.partnerEmail,
      recipientName: doctor.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'SENT',
      partnerId: doctor.id,
      metadata: {
        reviewId: review.id,
        rating: review.rating,
      },
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending review notification:', error);

    // Log failed email
    await logEmail({
      recipientEmail: doctor.partnerEmail,
      recipientName: doctor.partnerName,
      recipientType: 'VET',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      partnerId: doctor.id,
    });

    return { success: false, error };
  }
}

// Send review request to patient 2 days after prescription completion
export async function sendReviewRequestToPatient(
  patient: { email: string; name: string },
  doctor: any,
  appointmentId: number
) {
  const emailSubject = `Share Your Experience - Dr. ${doctor.partnerName}`;

  // Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.error(`Gmail rate limit reached (${GMAIL_DAILY_LIMIT}/day).`);
    await logEmail({
      recipientEmail: patient.email,
      recipientName: patient.name,
      recipientType: 'PATIENT',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'FAILED',
      errorMessage: `Rate limit exceeded: ${GMAIL_DAILY_LIMIT} emails/day limit reached`,
      appointmentId: appointmentId,
    });
    return { success: false, error: 'Rate limit exceeded' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.animalwellness.shop';
  const vetProfileLink = `${baseUrl}/Veternarians/${doctor.id}`;

  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .header { background-color: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .button { display: inline-block; padding: 12px 30px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
    .info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">How was your experience?</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Help others find great veterinary care</p>
    </div>

    <div class="content">
      <p style="font-size: 16px; color: #333;">Dear <strong>${patient.name}</strong>,</p>

      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        We hope your pet is feeling better after the recent consultation with <strong>Dr. ${doctor.partnerName}</strong>.
      </p>

      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Your feedback is invaluable and helps other pet owners make informed decisions. Would you take a moment to share your experience?
      </p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">Your review will help:</p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #555;">
          <li style="margin: 5px 0;">Other pet owners find quality veterinary care</li>
          <li style="margin: 5px 0;">Dr. ${doctor.partnerName} improve their services</li>
          <li style="margin: 5px 0;">Build a trusted community of pet caregivers</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${vetProfileLink}" class="button">Write a Review</a>
      </div>

      <p style="font-size: 13px; color: #666; text-align: center; line-height: 1.6;">
        It only takes a minute and means the world to us and other pet owners.
      </p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Contact Us:</strong></p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">📞 Phone: (+92) 335-4145431</p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">📧 Email: animalwellnessshop@gmail.com</p>
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
      to: patient.email,
      subject: emailSubject,
      html: emailHtml,
      text: `Dear ${patient.name}, We hope your pet is feeling better after the recent consultation with Dr. ${doctor.partnerName}. Please take a moment to share your experience by leaving a review. Your feedback helps other pet owners make informed decisions. Visit ${vetProfileLink} to write a review.`
    };

    const result = await transporter.sendMail(mailOptions);

    // Increment email count
    incrementEmailCount();

    // Log successful email
    await logEmail({
      recipientEmail: patient.email,
      recipientName: patient.name,
      recipientType: 'PATIENT',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'SENT',
      appointmentId: appointmentId,
      metadata: {
        doctorId: doctor.id,
        doctorName: doctor.partnerName,
      },
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending review request:', error);

    // Log failed email
    await logEmail({
      recipientEmail: patient.email,
      recipientName: patient.name,
      recipientType: 'PATIENT',
      subject: emailSubject,
      emailType: 'OTHER',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      appointmentId: appointmentId,
    });

    return { success: false, error };
  }
}