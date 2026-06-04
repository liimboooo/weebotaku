const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { CLIENT_URL } = require('./config/constants');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

function loadTemplate(name, vars) {
  const p = path.join(__dirname, 'emails', `${name}.html`);
  if (!fs.existsSync(p)) return '';
  let html = fs.readFileSync(p, 'utf8');
  for (const [k, v] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return html;
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    const match = html.match(/href="([^"]+)"/);
    if (match) console.log(`[EMAIL MOCK] Link: ${match[1]}`);
    return;
  }
  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
}

async function sendVerificationEmail(email, token, username) {
  const link = `${CLIENT_URL}/auth/verify-email/${token}`;
  const html = loadTemplate('verify-email', { username, link }) || `
    <div style="max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;font-family:sans-serif;border-radius:12px;border:1px solid rgba(102,126,234,0.15);">
      <h1 style="font-size:24px;margin:0 0 8px;">Verify your email</h1>
      <p style="color:#888;line-height:1.5;">Hi ${username},<br>Click the button below to verify your email and activate your AnimeWch account.</p>
      <a href="${link}" style="display:inline-block;padding:12px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">Verify Email</a>
      <p style="color:#666;font-size:13px;">This link expires in 24 hours. If you didn't create this account, ignore this email.</p>
    </div>
  `;
  await sendEmail({ to: email, subject: 'Verify your AnimeWch email', html });
}

async function sendPasswordResetEmail(email, token, username) {
  const link = `${CLIENT_URL}/auth/reset-password/${token}`;
  const html = loadTemplate('reset-password', { username, link }) || `
    <div style="max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;font-family:sans-serif;border-radius:12px;border:1px solid rgba(102,126,234,0.15);">
      <h1 style="font-size:24px;margin:0 0 8px;">Reset your password</h1>
      <p style="color:#888;line-height:1.5;">Hi ${username},<br>Click the button below to reset your password.</p>
      <a href="${link}" style="display:inline-block;padding:12px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">Reset Password</a>
      <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>
  `;
  await sendEmail({ to: email, subject: 'Reset your AnimeWch password', html });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
