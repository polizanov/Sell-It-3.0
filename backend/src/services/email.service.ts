import nodemailer from 'nodemailer';

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.EMAIL_FROM || user;

  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_PASS are required for email sending');
  }

  return { host, port, user, pass, from };
}

function getFrontendOrigin() {
  return (
    process.env.FRONTEND_ORIGIN ||
    process.env.CORS_ORIGIN ||
    'http://localhost:5173'
  );
}

export async function sendVerificationEmail(toEmail: string, token: string) {
  const { host, port, user, pass, from } = getSmtpConfig();
  const frontendOrigin = getFrontendOrigin();
  const verifyUrl = `${frontendOrigin.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Verify your SellIt email',
    text: `Welcome to SellIt!\n\nVerify your email by clicking this link:\n${verifyUrl}\n\nIf you didn’t create an account, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
        <h2>Welcome to SellIt</h2>
        <p>Verify your email by clicking the button below:</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#ff7a00;color:#111;text-decoration:none;border-radius:8px;font-weight:700">
            Verify email
          </a>
        </p>
        <p style="color:#666;font-size:12px">If you didn’t create an account, you can ignore this email.</p>
      </div>
    `
  });
}

