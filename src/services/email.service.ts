import nodemailer, { type TransportOptions, type SendMailOptions } from 'nodemailer';

const smtpHostname = process.env.SMTP_HOST || 'smtp.resend.com';
const smtpPort     = Number(process.env.SMTP_PORT) || 465;
const smtpSecure   = process.env.SMTP_SECURE === 'true';

const createTransporter = () =>
  nodemailer.createTransport({
    host:   smtpHostname,
    port:   smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
    pool:              false,
    connectionTimeout: 20_000,
    greetingTimeout:   20_000,
    socketTimeout:     25_000,
  } as TransportOptions);

// Non-blocking startup probe — logged for observability, never throws.
// Runs after a short delay so env vars and DNS are fully settled.
setTimeout(async () => {
  try {
    const t = createTransporter();
    await t.verify();
    t.close();
    console.log(`[email] SMTP ready — ${smtpHostname}:${smtpPort}`);
  } catch (err) {
    console.error('[email] SMTP verify failed:', err instanceof Error ? err.message : err);
  }
}, 3000);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const sendWithRetry = async (mailOptions: SendMailOptions): Promise<void> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
      transporter.close();
      return;
    } catch (err) {
      lastError = err;
      console.warn(
        `[email] Send attempt ${attempt}/${MAX_RETRIES} failed:`,
        err instanceof Error ? err.message : err,
      );
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError;
};

const LOGO_URL = `${process.env.API_URL || 'https://wayn-backend.onrender.com'}/public/images/logo.png`;

// Shared font stack — Google Fonts with robust fallbacks
const FONT_STACK = "'DM Sans', 'Segoe UI', Arial, sans-serif";

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:${FONT_STACK};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0E27;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#12183A;border-radius:20px;border:1px solid rgba(245,200,66,0.18);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
              <img src="${LOGO_URL}" alt="Wayn" height="44" style="height:44px;width:auto;display:block;margin:0 auto 24px;" >
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Reusable footer row
const footerRow = `
          <tr>
            <td style="padding:18px 40px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.07);">
              <p style="margin:0;font-size:12px;font-family:${FONT_STACK};color:rgba(255,255,255,0.22);letter-spacing:0.2px;">
                © 2026 Wayn · AI-powered Logistics Intelligence
              </p>
            </td>
          </tr>`;

export const sendOTPEmail = async (to: string, otp: string, fullName: string) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>Verify your Wayn account</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:${FONT_STACK};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0E27;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#12183A;border-radius:20px;border:1px solid rgba(245,200,66,0.18);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
              <img src="${LOGO_URL}" alt="Wayn" height="44" style="height:44px;width:auto;display:block;margin:0 auto 20px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;font-family:${FONT_STACK};color:#F5C842;letter-spacing:-0.3px;">Verify your account</h1>
              <p style="margin:10px 0 0;font-size:14px;font-family:${FONT_STACK};color:rgba(255,255,255,0.55);font-weight:400;">Hi ${fullName}, here is your one-time verification code</p>
            </td>
          </tr>
          <!-- OTP Code -->
          <tr>
            <td style="padding:40px;text-align:center;">
              <div style="display:inline-block;background:rgba(245,200,66,0.07);border:1.5px solid rgba(245,200,66,0.35);border-radius:14px;padding:22px 52px;margin-bottom:22px;">
                <span style="font-size:46px;font-weight:700;color:#F5C842;letter-spacing:14px;font-family:'Courier New',monospace;">${otp}</span>
              </div>
              <p style="margin:0;font-size:13px;font-family:${FONT_STACK};color:rgba(255,255,255,0.45);">
                This code expires in <strong style="color:rgba(255,255,255,0.75);font-weight:600;">10 minutes</strong>
              </p>
              <p style="margin:8px 0 0;font-size:12px;font-family:${FONT_STACK};color:rgba(255,255,255,0.28);">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          ${footerRow}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const fromAddress = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  return sendWithRetry({
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
  const frontendUrl = process.env.FRONTEND_URL || 'https://wayn-app.vercel.app';
  const resetLink   = `${frontendUrl}/reset-password?userId=${userId}&token=${token}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>Reset your Wayn password</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:${FONT_STACK};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0E27;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#12183A;border-radius:20px;border:1px solid rgba(245,200,66,0.18);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
              <img src="${LOGO_URL}" alt="Wayn" height="44" style="height:44px;width:auto;display:block;margin:0 auto 20px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;font-family:${FONT_STACK};color:#F5C842;letter-spacing:-0.3px;">Reset your password</h1>
              <p style="margin:10px 0 0;font-size:14px;font-family:${FONT_STACK};color:rgba(255,255,255,0.55);font-weight:400;">Hi ${fullName}, we received a request to reset your password.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;text-align:center;">
              <p style="margin:0 0 28px;font-size:14px;font-family:${FONT_STACK};color:rgba(255,255,255,0.55);line-height:1.7;font-weight:400;">
                Click the button below to set a new password.<br>This link expires in <strong style="color:#F5C842;font-weight:600;">5 minutes</strong>.
              </p>
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#F5C842,#D4A017);color:#0A0E27;font-family:${FONT_STACK};font-weight:700;font-size:15px;padding:15px 44px;border-radius:10px;text-decoration:none;letter-spacing:0.1px;">
                Reset Password
              </a>
              <p style="margin:28px 0 0;font-size:12px;font-family:${FONT_STACK};color:rgba(255,255,255,0.28);">
                If the button doesn't work, copy this link:<br>
                <a href="${resetLink}" style="color:rgba(245,200,66,0.6);word-break:break-all;font-size:11px;">${resetLink}</a>
              </p>
              <p style="margin:16px 0 0;font-size:12px;font-family:${FONT_STACK};color:rgba(255,255,255,0.28);">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          ${footerRow}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const fromAddress = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  return sendWithRetry({
    from: `"Wayn" <${fromAddress}>`,
    to,
    subject: 'Reset your Wayn password',
    html,
  });
};
