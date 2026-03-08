import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

const FROM_EMAIL = 'Inventory Pro <onboarding@resend.dev>'; // Default Resend testing email

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
  if (!resend) {
    console.log('📧 Email Mock (RESEND_API_KEY not set):');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    return { success: true, id: 'mock-id' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend Error:', error);
      throw error;
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Failed to send email:', err);
    throw err;
  }
};

export const sendVerificationEmail = async (email: string, token: string, appUrl: string) => {
  const url = `${appUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify your email - Inventory Pro',
    html: `
      <h1>Welcome to Inventory Pro!</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${url}">${url}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string, appUrl: string) => {
  const url = `${appUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset your password - Inventory Pro',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${url}">${url}</a>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `,
  });
};

export const sendInvitationEmail = async (email: string, token: string, companyName: string, appUrl: string) => {
  const url = `${appUrl}/accept-invitation?token=${token}`;
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${companyName} on Inventory Pro`,
    html: `
      <h1>Join ${companyName}</h1>
      <p>You have been invited to join the ${companyName} workspace on Inventory Pro.</p>
      <p>Click the link below to accept the invitation and set up your account:</p>
      <a href="${url}">${url}</a>
    `,
  });
};
