import nodemailer from 'nodemailer';

const smtpSecure = process.env.SMTP_SECURE === 'true';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: smtpSecure, // false = STARTTLS on port 587 (correct for Office365)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // allow self-signed or intermediate certs
  },
});

// Verify connection once on startup so errors surface immediately in server logs
transporter.verify((err) => {
  if (err) {
    console.error('[email] SMTP connection failed:', err.message);
    console.error('[email] Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL in .env');
  } else {
    console.log('[email] SMTP ready —', process.env.SMTP_HOST);
  }
});

const LOGO_URL = `${process.env.API_URL || 'https://wayn-backend.onrender.com'}/public/images/logo.png`;

export const sendOTPEmail = async (to: string, otp: string, fullName: string) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Wayn account</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0E27;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:rgba(18,24,58,0.95);border-radius:20px;border:1px solid rgba(245,200,66,0.2);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:20px;">
                <img src="${LOGO_URL}" alt="Wayn" width="38" height="38" style="width:38px;height:38px;border-radius:50%;display:inline-block;vertical-align:middle;">
                <span style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Wayn</span>
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#F5C842;letter-spacing:-0.5px;">Verify your account</h1>
              <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.6);">Hi ${fullName}, here is your one-time verification code</p>
            </td>
          </tr>
          <!-- OTP Code -->
          <tr>
            <td style="padding:40px;text-align:center;">
              <div style="display:inline-block;background:rgba(245,200,66,0.08);border:2px solid rgba(245,200,66,0.4);border-radius:16px;padding:24px 48px;margin-bottom:24px;">
                <span style="font-size:48px;font-weight:800;color:#F5C842;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</span>
              </div>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);">
                This code expires in <strong style="color:rgba(255,255,255,0.8);">10 minutes</strong>
              </p>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.3);">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);">
                © 2026 Wayn · AI-powered Logistics Intelligence
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
  return transporter.sendMail({
    from: `"Wayn" <${fromAddress}>`,
    to,
    subject: 'Your Wayn verification code',
    html,
  });
};

export const sendPasswordResetEmail = async (
  to: string,
  fullName: string,
  userId: string,
  token: string,
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink   = `${frontendUrl}/reset-password?userId=${userId}&token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Wayn password</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0E27;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:rgba(18,24,58,0.95);border-radius:20px;border:1px solid rgba(245,200,66,0.2);overflow:hidden;">
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:20px;">
                <img src="${LOGO_URL}" alt="Wayn" width="38" height="38" style="width:38px;height:38px;border-radius:50%;display:inline-block;vertical-align:middle;">
                <span style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Wayn</span>
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#F5C842;letter-spacing:-0.5px;">Reset your password</h1>
              <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.6);">Hi ${fullName}, we received a request to reset your password.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;text-align:center;">
              <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;">
                Click the button below to set a new password. This link expires in <strong style="color:#F5C842;">5 minutes</strong>.
              </p>
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#F5C842,#D4A017);color:#0A0E27;font-weight:800;font-size:15px;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:-0.2px;">
                Reset Password
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.3);">
                If the button doesn't work, copy this link:<br>
                <a href="${resetLink}" style="color:rgba(245,200,66,0.7);word-break:break-all;font-size:11px;">${resetLink}</a>
              </p>
              <p style="margin:16px 0 0;font-size:13px;color:rgba(255,255,255,0.3);">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);">© 2026 Wayn · AI-powered Logistics Intelligence</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
  return transporter.sendMail({
    from: `"Wayn" <${fromAddress}>`,
    to,
    subject: 'Reset your Wayn password',
    html,
  });
};
