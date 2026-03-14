const nodemailer = require('nodemailer');
const db = require('../db');

function getTransporter() {
  const settings = {};
  const rows = db.prepare('SELECT key, value FROM site_settings WHERE key LIKE ?').all('smtp%');
  for (const row of rows) settings[row.key] = row.value;

  if (!settings.smtp_host || !settings.smtp_user) return null;

  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port || 587),
    secure: settings.smtp_secure === 'true',
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
  });
}

function getSiteName() {
  const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('site_name');
  return row?.value || 'SalesO';
}

function getFromAddress() {
  const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('smtp_from');
  return row?.value || 'noreply@saleso.local';
}

async function sendInviteEmail(toEmail, inviteToken, invitedByUsername) {
  const transporter = getTransporter();
  if (!transporter) return { success: false, reason: 'SMTP not configured' };

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const inviteUrl = `${frontendUrl}/register?token=${inviteToken}`;
  const siteName = getSiteName();

  try {
    await transporter.sendMail({
      from: `"${siteName}" <${getFromAddress()}>`,
      to: toEmail,
      subject: `You've been invited to ${siteName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #111118; color: #e8e8f0; border-radius: 12px;">
          <h1 style="color: #e6a817; font-size: 24px; margin-bottom: 8px;">${siteName}</h1>
          <p style="color: #9595a8; margin-bottom: 24px;">${invitedByUsername} has invited you to join ${siteName}</p>
          <a href="${inviteUrl}" style="display: inline-block; background: #e6a817; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Accept Invitation</a>
          <p style="color: #6b6b80; font-size: 12px; margin-top: 24px;">This invite expires in 7 days. If you didn't expect this, ignore this email.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, reason: err.message };
  }
}

async function sendPasswordResetEmail(toEmail, resetToken) {
  const transporter = getTransporter();
  if (!transporter) return { success: false, reason: 'SMTP not configured' };

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  const siteName = getSiteName();

  try {
    await transporter.sendMail({
      from: `"${siteName}" <${getFromAddress()}>`,
      to: toEmail,
      subject: `Reset your ${siteName} password`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #111118; color: #e8e8f0; border-radius: 12px;">
          <h1 style="color: #e6a817; font-size: 24px; margin-bottom: 8px;">${siteName}</h1>
          <p style="color: #9595a8; margin-bottom: 24px;">You requested a password reset.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #e6a817; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Reset Password</a>
          <p style="color: #6b6b80; font-size: 12px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, ignore it.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

module.exports = { sendInviteEmail, sendPasswordResetEmail };
