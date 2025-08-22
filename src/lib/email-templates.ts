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
  links: { historyForm: string; prescriptionForm: string | null }
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
    .btn-prescription { background: #9333ea; color: white; }
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
        <h3 style="text-align: center; margin-top: 0;">📋 PATIENT FORMS - PLEASE COMPLETE BOTH</h3>
        <p style="text-align: center;">Please fill these forms for proper record keeping and treatment documentation:</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <h4>Step 1: Complete History Form</h4>
          <p style="font-size: 14px; color: #666;">Document the examination findings and patient history</p>
          <a href="${links.historyForm}" class="button btn-form">📝 Fill History Form</a>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
          <h4>Step 2: Create Prescription</h4>
          <p style="font-size: 14px; color: #666;">Provide treatment plan and medication details</p>
          <a href="${links.prescriptionForm}" class="button btn-prescription">💊 Fill Prescription Form</a>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 15px;">
          <em>Both forms are pre-filled with appointment data for your convenience</em>
        </p>
      </div>
      
      <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
        <strong>✅ Next Steps:</strong>
        <ol style="margin: 10px 0;">
          <li>Contact the owner immediately at <strong>${appointment.doctor}</strong></li>
          <li>Complete the <strong>History Form</strong> with examination findings</li>
          <li>Fill the <strong>Prescription Form</strong> with treatment details</li>
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
    text: `Case assigned. Owner contact: ${appointment.doctor}. Please check email for full details and both forms (History & Prescription).`
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
