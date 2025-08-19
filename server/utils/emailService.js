const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Global transporter instance
let transporter = null;
let isTestAccount = false;

// Create transporter (supports Gmail, SendGrid, Ethereal Email)
const createTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  try {
    // Check email service configuration
    const emailService = process.env.EMAIL_SERVICE || 'ethereal';
    
    if (emailService === 'gmail' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Gmail configuration
      console.log('📧 Configuring Gmail email service...');
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else if (emailService === 'sendgrid' && process.env.EMAIL_PASS) {
      // SendGrid configuration
      console.log('📧 Configuring SendGrid email service...');
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.sendgrid.net',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || 'apikey',
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      // Ethereal Email - Create a real test account
      console.log('📧 Creating Ethereal Email test account...');
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      isTestAccount = true;
      console.log('✅ Ethereal Email test account created:');
      console.log(`   📧 Email: ${testAccount.user}`);
      console.log(`   🔑 Password: ${testAccount.pass}`);
      console.log(`   🌐 Inbox: https://ethereal.email`);
    }
    
    // Test the connection
    await transporter.verify();
    console.log('✅ Email service connection verified successfully');
    
    return transporter;
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error.message);
    throw error;
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Generate verification token (alternative to OTP for URL-based verification)
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send delivery dispatch notification email to transporter
const sendDeliveryDispatchEmail = async (transporterEmail, transporterName, deliveryDetails) => {
  try {
    const emailTransporter = await createTransporter();
    
    const mailOptions = {
      from: {
        name: 'AgriSync Dispatch',
        address: process.env.EMAIL_USER || 'dispatch@agrisync.com'
      },
      to: transporterEmail,
      subject: '🚚 New Delivery Assignment - AgriSync',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Delivery Assignment - AgriSync</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚚 New Delivery Assignment</h1>
            <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">AgriSync Transport Dispatch</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #0ea5e9; margin-top: 0;">Hello ${transporterName}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              You have been assigned a new delivery. Please review the details below and prepare for pickup:
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; border: 2px solid #0ea5e9; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #0ea5e9;">📦 Delivery Details</h3>
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                  <strong>Goods:</strong>
                  <span>${deliveryDetails.goodsDescription}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                  <strong>Quantity:</strong>
                  <span>${deliveryDetails.quantity} units</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                  <strong>Priority:</strong>
                  <span style="${deliveryDetails.urgency === 'urgent' ? 'color: #dc2626; font-weight: bold;' : deliveryDetails.urgency === 'high' ? 'color: #f59e0b; font-weight: bold;' : 'color: #10b981;'}">
                    ${deliveryDetails.urgency?.toUpperCase() || 'NORMAL'}
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                  <strong>Pickup Location:</strong>
                  <span>${deliveryDetails.pickupLocation}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <strong>Delivery Location:</strong>
                  <span>${deliveryDetails.dropoffLocation}</span>
                </div>
              </div>
            </div>
            
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e40af;">📱 Next Steps:</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #1e3a8a;">
                <li style="margin-bottom: 8px;">Log into your AgriSync dashboard to view full details</li>
                <li style="margin-bottom: 8px;">Contact the farmer if you need clarification</li>
                <li style="margin-bottom: 8px;">Update delivery status when you start transit</li>
                <li style="margin-bottom: 8px;">Share your live location during delivery</li>
              </ul>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⚡ Important:</strong> Please acknowledge receipt of this assignment in your dashboard and update the status promptly. Farmers are waiting for their goods to be delivered safely.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/transporter/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                🚛 Open Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Need help? Contact our dispatch team or reply to this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              © 2024 AgriSync. Connecting farmers with reliable transportation.
            </p>
            <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
              This is an automated dispatch notification. Please do not reply directly to this message.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        New Delivery Assignment - AgriSync
        
        Hello ${transporterName},
        
        You have been assigned a new delivery:
        
        Goods: ${deliveryDetails.goodsDescription}
        Quantity: ${deliveryDetails.quantity} units
        Priority: ${deliveryDetails.urgency?.toUpperCase() || 'NORMAL'}
        Pickup: ${deliveryDetails.pickupLocation}
        Delivery: ${deliveryDetails.dropoffLocation}
        
        Please log into your AgriSync dashboard to view full details and manage this delivery.
        
        Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/transporter/dashboard
        
        Best regards,
        AgriSync Dispatch Team
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Delivery dispatch email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending delivery dispatch email:', error);
    return { success: false, error: error.message };
  }
};

// Send delivery status update email
const sendDeliveryStatusUpdateEmail = async (recipientEmail, recipientName, deliveryDetails, oldStatus, newStatus, updatedByName) => {
  try {
    const emailTransporter = await createTransporter();
    
    const statusEmojis = {
      'pending': '⏳',
      'assigned': '✅',
      'in_transit': '🚛',
      'delivered': '📦',
      'cancelled': '❌'
    };
    
    const statusColors = {
      'pending': '#f59e0b',
      'assigned': '#3b82f6',
      'in_transit': '#0ea5e9',
      'delivered': '#10b981',
      'cancelled': '#ef4444'
    };
    
    const mailOptions = {
      from: {
        name: 'AgriSync Tracking',
        address: process.env.EMAIL_USER || 'tracking@agrisync.com'
      },
      to: recipientEmail,
      subject: `${statusEmojis[newStatus]} Delivery Update: ${deliveryDetails.goodsDescription}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Delivery Status Update - AgriSync</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${statusColors[newStatus]} 0%, ${statusColors[newStatus]}cc 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${statusEmojis[newStatus]} Delivery Status Update</h1>
            <p style="color: white; opacity: 0.9; margin: 10px 0 0 0; font-size: 16px;">AgriSync Live Tracking</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #e9ecef;">
            <h2 style="color: ${statusColors[newStatus]}; margin-top: 0;">Hello ${recipientName}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Your delivery status has been updated. Here are the latest details:
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; border: 2px solid ${statusColors[newStatus]}; margin: 25px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                  <h3 style="margin: 0; color: ${statusColors[newStatus]};">📦 ${deliveryDetails.goodsDescription}</h3>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${deliveryDetails.quantity} units</p>
                </div>
                <div style="text-align: right;">
                  <div style="background: ${statusColors[newStatus]}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                    ${statusEmojis[newStatus]} ${newStatus.replace('_', ' ').toUpperCase()}
                  </div>
                  ${oldStatus ? `<p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">Previous: ${oldStatus}</p>` : ''}
                </div>
              </div>
              
              <div style="border-top: 1px solid #f3f4f6; padding-top: 15px;">
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span style="color: #666;">From:</span>
                    <span>${deliveryDetails.pickupLocation}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span style="color: #666;">To:</span>
                    <span>${deliveryDetails.dropoffLocation}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span style="color: #666;">Updated by:</span>
                    <span>${updatedByName}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span style="color: #666;">Updated at:</span>
                    <span>${new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, ${statusColors[newStatus]}, ${statusColors[newStatus]}cc); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📱 Track Delivery
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Stay updated with real-time tracking in your AgriSync dashboard.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              © 2024 AgriSync. Real-time agricultural supply chain tracking.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Delivery Status Update - AgriSync
        
        Hello ${recipientName},
        
        Your delivery status has been updated:
        
        Item: ${deliveryDetails.goodsDescription} (${deliveryDetails.quantity} units)
        Status: ${newStatus.replace('_', ' ').toUpperCase()}
        ${oldStatus ? `Previous Status: ${oldStatus}` : ''}
        Updated by: ${updatedByName}
        Updated at: ${new Date().toLocaleString()}
        
        From: ${deliveryDetails.pickupLocation}
        To: ${deliveryDetails.dropoffLocation}
        
        Track your delivery: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard
        
        Best regards,
        AgriSync Tracking Team
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Delivery status update email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending delivery status update email:', error);
    return { success: false, error: error.message };
  }
};

// Send OTP email
const sendOTPEmail = async (email, name, otp) => {
  try {
    const emailTransporter = await createTransporter();
    
    const fromAddress = process.env.EMAIL_SERVICE === 'ethereal' 
      ? 'noreply@agrisync.com' 
      : process.env.EMAIL_USER || 'noreply@agrisync.com';
    
    const mailOptions = {
      from: {
        name: 'AgriSync',
        address: process.env.EMAIL_USER || 'noreply@agrisync.com'
      },
      to: email,
      subject: '🌱 Verify Your Email - AgriSync Registration',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - AgriSync</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌱 Welcome to AgriSync!</h1>
            <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px;">Smart Agriculture Supply Chain Platform</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #065f46; margin-top: 0;">Hello ${name}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Thank you for registering with AgriSync. To complete your registration and verify your email address, please use the verification code below:
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; border: 2px solid #10b981; text-align: center; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Verification Code:</p>
              <div style="font-size: 36px; font-weight: bold; color: #065f46; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">This code expires in 10 minutes</p>
            </div>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>🔐 Security Note:</strong> If you didn't request this verification, please ignore this email. Your account is not activated until you complete the verification process.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              Once verified, your account will be reviewed by our admin team for approval. You'll receive another email once your account is approved and ready to use.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              Need help? Reply to this email or contact our support team.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              © 2024 AgriSync. Empowering farmers with smart supply chain solutions.
            </p>
            <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
              This is an automated email, please do not reply directly to this message.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to AgriSync!
        
        Hello ${name},
        
        Thank you for registering with AgriSync. To complete your registration, please use this verification code: ${otp}
        
        This code expires in 10 minutes.
        
        If you didn't request this verification, please ignore this email.
        
        Best regards,
        AgriSync Team
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email after email verification
const sendWelcomeEmail = async (email, name, role) => {
  try {
    const emailTransporter = await createTransporter();
    
    const roleDisplayNames = {
      farmer: '🌾 Farmer',
      transporter: '🚛 Transporter', 
      warehouse_manager: '🏦 Warehouse Manager',
      market_vendor: '🛒 Market Vendor'
    };
    
    const mailOptions = {
      from: {
        name: 'AgriSync',
        address: process.env.EMAIL_USER || 'noreply@agrisync.com'
      },
      to: email,
      subject: '🎉 Welcome to AgriSync - Email Verified Successfully!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AgriSync</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to AgriSync!</h1>
            <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px;">Email Verified Successfully</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #065f46; margin-top: 0;">Congratulations ${name}! ✅</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Your email has been successfully verified! You've registered as a <strong>${roleDisplayNames[role] || role}</strong> on the AgriSync platform.
            </p>
            
            <div style="background: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #065f46;">📋 What's Next?</h3>
              <p style="margin: 0; font-size: 14px; color: #064e3b;">
                Your account is now pending admin approval. Our team will review your registration and approve your account soon. You'll receive another email once your account is ready to use.
              </p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #065f46;">🚀 What You Can Do With AgriSync:</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
                <li style="margin-bottom: 8px;">📊 Track crop conditions and yield forecasts</li>
                <li style="margin-bottom: 8px;">🤝 Connect with markets and suppliers</li>
                <li style="margin-bottom: 8px;">📦 Optimize transportation and logistics</li>
                <li style="margin-bottom: 8px;">💚 Promote sustainable farming practices</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Have questions? Our support team is here to help! Reply to this email or contact us through the platform.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              © 2024 AgriSync. Empowering farmers with smart supply chain solutions.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to AgriSync!
        
        Congratulations ${name}!
        
        Your email has been successfully verified! You've registered as a ${role} on the AgriSync platform.
        
        What's Next?
        Your account is now pending admin approval. Our team will review your registration and approve your account soon.
        
        Best regards,
        AgriSync Team
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset OTP email
const sendPasswordResetOTP = async (email, name, otp) => {
  try {
    const emailTransporter = await createTransporter();
    
    const mailOptions = {
      from: {
        name: 'AgriSync Security',
        address: process.env.EMAIL_USER || 'security@agrisync.com'
      },
      to: email,
      subject: '🔐 Password Reset Verification Code - AgriSync',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - AgriSync</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset Request</h1>
            <p style="color: #fed7aa; margin: 10px 0 0 0; font-size: 16px;">AgriSync Security</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #dc2626; margin-top: 0;">Hello ${name}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              We received a request to reset your password for your AgriSync account. To proceed with the password reset, please use the verification code below:
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; border: 2px solid #dc2626; text-align: center; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Password Reset Code:</p>
              <div style="font-size: 36px; font-weight: bold; color: #dc2626; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">This code expires in 15 minutes</p>
            </div>
            
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>⚠️ Security Alert:</strong> If you did not request this password reset, please ignore this email and your password will remain unchanged. Consider changing your password if you believe your account may be compromised.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              After entering this code, you'll be able to create a new password for your account.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              Need help? Reply to this email or contact our support team.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              © 2024 AgriSync. Empowering farmers with smart supply chain solutions.
            </p>
            <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
              This is an automated security email, please do not reply directly to this message.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - AgriSync
        
        Hello ${name},
        
        We received a request to reset your password for your AgriSync account.
        
        Your password reset verification code: ${otp}
        
        This code expires in 15 minutes.
        
        If you did not request this password reset, please ignore this email.
        
        Best regards,
        AgriSync Security Team
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Password reset OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset confirmation email
const sendPasswordResetConfirmation = async (email, name) => {
  try {
    const emailTransporter = await createTransporter();
    
    const mailOptions = {
      from: {
        name: 'AgriSync Security',
        address: process.env.EMAIL_USER || 'security@agrisync.com'
      },
      to: email,
      subject: '✅ Password Reset Successful - AgriSync',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful - AgriSync</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Password Reset Successful</h1>
            <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px;">AgriSync Security</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #065f46; margin-top: 0;">Hello ${name}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Your password has been successfully reset for your AgriSync account. You can now log in with your new password.
            </p>
            
            <div style="background: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; color: #064e3b;">
                <strong>🔐 Security Reminder:</strong> Keep your password secure and don't share it with anyone. If you notice any suspicious activity on your account, please contact us immediately.
              </p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #065f46;">🔒 Security Best Practices:</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
                <li style="margin-bottom: 8px;">Use a strong, unique password for your AgriSync account</li>
                <li style="margin-bottom: 8px;">Don't share your password with anyone</li>
                <li style="margin-bottom: 8px;">Log out from shared or public devices</li>
                <li style="margin-bottom: 8px;">Contact support if you notice suspicious activity</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              If you did not reset your password, please contact our support team immediately at security@agrisync.com
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              © 2024 AgriSync. Empowering farmers with smart supply chain solutions.
            </p>
            <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
              This is an automated security email, please do not reply directly to this message.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Successful - AgriSync
        
        Hello ${name},
        
        Your password has been successfully reset for your AgriSync account.
        You can now log in with your new password.
        
        If you did not reset your password, please contact our support team immediately.
        
        Best regards,
        AgriSync Security Team
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateOTP,
  generateVerificationToken,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetOTP,
  sendPasswordResetConfirmation,
  sendDeliveryDispatchEmail,
  sendDeliveryStatusUpdateEmail
};
