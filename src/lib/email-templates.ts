export function getInitialNotificationEmail(
  vet: any,
  appointment: any,
  acceptLink: string,
  declineLink: string
) {
  const urgencyTag = appointment.isEmergency ? 
    '<div style="background: #ff4444; color: white; padding: 10px; text-align: center; font-weight: bold;">⚠️ EMERGENCY CASE ⚠️</div>' : '';

  const consultationType = 
    appointment.paymentInfo?.consultationType === 'physical' ? '🏥 Physical Visit' :
    appointment.paymentInfo?.consultationType === 'virtual' ? '💻 Virtual Consultation' :
    appointment.paymentInfo?.consultationType === 'needy' ? '🤝 Free Consultation (Needy)' :
    '📋 Consultation';

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
    .footer { margin-top: 20px; padding: 15px; background: #f1f1f1; font-size: 12px; color: #666; }
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
        <strong>Type:</strong> ${consultationType}<br>
        ${appointment.isEmergency ? '<strong style="color: red;">⚠️ EMERGENCY CASE</strong><br>' : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #e8f5e9; border-radius: 10px;">
        <h3>Are you available for this case?</h3>
        <a href="${acceptLink}" class="button btn-accept">✓ YES, I'M AVAILABLE</a>
        <a href="${declineLink}" class="button btn-decline">✗ NOT AVAILABLE</a>
      </div>
      
      <p style="text-align: center; color: #666;">
        <small>First doctor to accept will receive full patient details</small>
      </p>
    </div>
    
    <div class="footer">
      <p>Quick response appreciated ${appointment.isEmergency ? 'especially for this emergency' : ''}.</p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: `${appointment.isEmergency ? '🚨 URGENT: ' : ''}New Case - ${appointment.species} in ${appointment.city}`,
    html: emailHtml,
    text: `New case available: ${appointment.species} with ${appointment.description} in ${appointment.city}. Click to accept or decline.`
  };
}

// Acceptance confirmation - full details
export function getAcceptanceConfirmationEmail(
  vet: any,
  appointment: any,
  historyFormLink: string
) {
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
    .forms-container { background: #fff3cd; padding: 20px; border-radius: 10px; margin: 30px 0; }
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

      <div class="info-box">
        <h3>💰 Payment Information</h3>
        <strong>Consultation Type:</strong> ${appointment.paymentInfo?.consultationType || 'Standard'}<br>
        ${appointment.paymentInfo?.consultationFee ? `<strong>Fee:</strong> Rs. ${appointment.paymentInfo.consultationFee}<br>` : ''}
        <strong>Payment Method:</strong> ${appointment.paymentInfo?.paymentMethod || 'Not specified'}
      </div>

      <div class="forms-container">
        <h3 style="text-align: center; margin-top: 0;">📋 Next Step: Fill History Form</h3>
        <p style="text-align: center; color: #666; margin-bottom: 10px;">
          After completing the history form, you'll receive a link to the prescription form.
        </p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${historyFormLink}" class="button btn-form">📝 Fill History Form Now</a>
        </div>

        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 15px;">
          <em>The form is pre-filled with appointment data for your convenience</em>
        </p>
      </div>

      <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
        <strong>✅ Next Steps:</strong>
        <ol style="margin: 10px 0;">
          <li>Contact the owner immediately at <strong>${appointment.doctor}</strong></li>
          <li>Complete the <strong>History Form</strong> with examination findings</li>
          <li>After submitting the history form, you'll receive the <strong>Prescription Form link</strong> via email</li>
          <li>Complete the prescription form with treatment details</li>
          <li>Schedule follow-up if needed</li>
        </ol>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; text-align: center;">
        <p style="color: #666; font-size: 14px;">
          <strong>Important:</strong> This information is confidential. Please handle with care.<br>
          If you have any issues with the forms, please contact system support.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: `✅ Case Assigned - ${appointment.species} - Contact: ${appointment.doctor}`,
    html: emailHtml,
    text: `Case assigned. Owner contact: ${appointment.doctor}. Please check email for full details and fill the History Form. The Prescription Form link will be sent after you complete the history form.`
  };
}

// Case taken notification for other doctors
export function getCaseTakenEmail(vet: any, appointment: any, acceptedByDoctor: string) {
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
</html>
  `;

  return {
    subject: `Case Taken - ${appointment.species} in ${appointment.city}`,
    html: emailHtml,
    text: `The case has been accepted by Dr. ${acceptedByDoctor}. Thank you for your availability.`
  };
}

// Patient notification when doctor is assigned
export function getPatientDoctorAssignmentEmail(appointment: any, doctor: any) {
  console.log('=== EMAIL TEMPLATE DEBUG ===');
  console.log('appointment data:', {
    id: appointment.id,
    species: appointment.species,
    customerName: appointment.customer?.name,
    customerEmail: appointment.customer?.email,
    city: appointment.city
  });
  console.log('doctor data:', {
    name: doctor.partnerName,
    email: doctor.partnerEmail,
    city: doctor.cityName
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.animalwellness.shop';
  const vetProfileLink = `${baseUrl}/Veternarians/${doctor.id}`;

  const consultationType =
    appointment.paymentInfo?.consultationType === 'physical' ? '🏥 Physical Visit' :
    appointment.paymentInfo?.consultationType === 'virtual' ? '💻 Virtual Consultation' :
    appointment.paymentInfo?.consultationType === 'needy' ? '🤝 Free Consultation' :
    '📋 Consultation';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #22c55e; }
    .doctor-box { background: #e8f5e9; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
    .contact-box { background: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
    .footer { background: #f8f9fa; padding: 15px; margin-top: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎉 Great News!</h2>
      <h3>A Veterinarian Has Been Found for Your Animal</h3>
    </div>
    
    <div class="content">
      <p>Dear ${appointment.customer?.name || 'Valued Customer'},</p>
      
      <p>We're excited to inform you that we have found a qualified veterinarian for your <strong>${appointment.species}</strong>!</p>
      
      <div class="doctor-box">
        <h3 style="margin-top: 0; color: #22c55e;">🩺 Your Assigned Veterinarian</h3>
        <h2 style="margin: 10px 0; color: #333;">Dr. ${doctor.partnerName}</h2>
        ${doctor.specialization ? `<p><strong>Specialization:</strong> ${doctor.specialization}</p>` : ''}
        <p><strong>Location:</strong> ${doctor.cityName}${doctor.state ? `, ${doctor.state}` : ''}</p>
        ${doctor.partnerMobileNumber ? `<p><strong>Contact:</strong> ${doctor.partnerMobileNumber}</p>` : ''}

        <div style="margin-top: 20px;">
          <a href="${vetProfileLink}" style="display: inline-block; padding: 12px 30px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            👨‍⚕️ View Doctor's Full Profile
          </a>
        </div>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">
          See qualifications, reviews, and more information about your doctor
        </p>
      </div>
      
      <div class="info-box">
        <h4 style="margin-top: 0;">📋 Appointment Summary</h4>
        <strong>Animal:</strong> ${appointment.species}<br>
        <strong>Gender:</strong> ${appointment.gender || 'Not specified'}<br>
        <strong>Issue:</strong> ${appointment.description}<br>
        <strong>Type:</strong> ${consultationType}<br>
        <strong>Location:</strong> ${appointment.city}${appointment.state ? `, ${appointment.state}` : ''}<br>
        ${appointment.fullAddress ? `<strong>Address:</strong> ${appointment.fullAddress}<br>` : ''}
        ${appointment.isEmergency ? '<strong style="color: red;">⚠️ Emergency Case - Priority Treatment</strong><br>' : ''}
        <strong>Scheduled:</strong> ${new Date(appointment.appointmentAt).toLocaleString('en-PK', {
          timeZone: 'Asia/Karachi',
          dateStyle: 'full',
          timeStyle: 'short'
        })}
      </div>
      
      <div class="contact-box">
        <h4 style="margin-top: 0;">📞 What Happens Next?</h4>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li><strong>Dr. ${doctor.partnerName} will contact you directly</strong> at your provided number: <strong>${appointment.doctor}</strong></li>
          <li>The doctor will coordinate the appointment time and location</li>
          <li>Please be available to receive the doctor's call</li>
          <li>The doctor will examine your animal and provide treatment</li>
        </ol>
      </div>
      
      ${appointment.paymentInfo?.consultationType !== 'needy' ? `
      <div class="info-box">
        <h4 style="margin-top: 0;">💰 Payment Information</h4>
        <strong>Consultation Fee:</strong> Rs. ${appointment.paymentInfo?.consultationFee || 0}<br>
        <strong>Payment Status:</strong> ${appointment.paymentInfo ? 'Paid' : 'Pending'}<br>
        <strong>Payment Method:</strong> ${appointment.paymentInfo?.paymentMethod ? appointment.paymentInfo.paymentMethod.toUpperCase() : 'N/A'}<br>
      </div>
      ` : `
      <div class="info-box" style="background: #d4edda;">
        <h4 style="margin-top: 0; color: #155724;">🤝 Free Consultation</h4>
        <p style="margin: 0; color: #155724;">This is a free consultation service for those in need. No payment is required.</p>
      </div>
      `}
      
      <div style="background: #e8f5e9; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center;">
        <h4 style="color: #22c55e; margin-top: 0;">Important Instructions:</h4>
        <ul style="text-align: left; display: inline-block; margin: 0;">
          <li>Keep your phone available - the doctor will call you</li>
          <li>Prepare any questions about your animal's condition</li>
          <li>Have your animal ready for examination</li>
          <li>Follow the doctor's treatment instructions carefully</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Thank you for using our veterinary service!</strong></p>
      <p>If you have any questions or concerns, please contact our support team.</p>
      <p>We hope your animal recovers quickly! 🐾</p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: `🩺 Veterinarian Assigned - Dr. ${doctor.partnerName} will contact you soon!`,
    html: emailHtml,
    text: `Great news! Dr. ${doctor.partnerName} has been assigned to your ${appointment.species}. The doctor will contact you at ${appointment.doctor}. Please keep your phone available.`
  };
}
