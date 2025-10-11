// services/emailService.js
import nodemailer from 'nodemailer';

// 1️⃣ Create a reusable transporter using Gmail SMTP
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not found in environment variables');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App Password
    },
  });
};

// 2️⃣ Send new message notification
export const sendNewMessageEmail = async (recipientEmail, senderName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Your Chat App" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `You have a new message from ${senderName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Message Notification</h2>
        <p>Hello,</p>
        <p>You've received a new message from <strong>${senderName}</strong> while you were away.</p>
        <p>Log in to your account to view the message and reply.</p>
        <a href="http://localhost:5173/login" style="display: inline-block; padding: 10px 20px; background-color: #5e54f3; color: white; text-decoration: none; border-radius: 5px;">
          View Message
        </a>
        <p>Thanks,<br/>The Chat App Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notification email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${recipientEmail}:`, error);
  }
};

// 3️⃣ Send password reset email
export const sendPasswordResetEmail = async (recipientEmail, userName, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Lovebirds Support" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: '🔐 Password Reset Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-code { background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; margin: 20px 0; border-radius: 5px; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>You requested to reset your password. Use the verification code below:</p>
          <div class="otp-code">${otp}</div>
          <div class="warning"><strong>⚠️ This code will expire in 10 minutes.</strong></div>
          <p>If you didn't request this password reset, please ignore this email or contact support.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 14px;">
          <p>Thanks,<br/>The Lovebirds Team</p>
        </div>
      </body>
      </html>
    `,
    text: `Password Reset Request\n\nHello ${userName},\n\nYour verification code: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\n\nThanks,\nThe Lovebirds Team`,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully to:', recipientEmail);
    console.log('📧 Message ID:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    if (error.code === 'EAUTH') console.error('🔐 Authentication failed. Check email credentials.');
    if (error.code === 'EENVELOPE') console.error('📮 Invalid recipient address:', recipientEmail);
    return false;
  }
};
