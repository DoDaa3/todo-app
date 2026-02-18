import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const fromAddress =
  process.env.EMAIL_FROM || "Kanban App <onboarding@resend.dev>";

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verifyUrl = `${clientUrl}/verify-email?token=${token}`;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject: "Verify your email — Kanban App",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #2563eb; border-radius: 12px; padding: 12px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">K</span>
          </div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px;">
          Verify your email
        </h1>
        <p style="color: #6b7280; text-align: center; margin-bottom: 32px;">
          Hi ${name}, thanks for signing up! Please verify your email address to get started.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${verifyUrl}"
             style="display: inline-block; background: #2563eb; color: white; font-weight: 600;
                    padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
