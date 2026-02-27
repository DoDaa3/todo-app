import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const fromAddress =
  process.env.EMAIL_FROM || `FlowBoard <${process.env.GMAIL_USER}>`;

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verifyUrl = `${clientUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: "Verify your email — FlowBoard",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 12px; padding: 12px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">F</span>
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
             style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; font-weight: 600;
                    padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #7c3aed; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
    `,
  });
}

export async function sendEmailChangeVerification(
  to: string,
  name: string,
  token: string
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verifyUrl = `${clientUrl}/verify-email?token=${token}&type=email-change`;

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: "Confirm your new email — FlowBoard",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 12px; padding: 12px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">F</span>
          </div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px;">
          Confirm your new email
        </h1>
        <p style="color: #6b7280; text-align: center; margin-bottom: 32px;">
          Hi ${name}, you requested to change your email address. Please confirm this new email to complete the change.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${verifyUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; font-weight: 600;
                    padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Confirm Email Address
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          If you didn't request this change, you can safely ignore this email.<br/>
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #7c3aed; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
    `,
  });
}

export async function sendDueDateReminderEmail(
  to: string,
  name: string,
  taskTitle: string,
  dueDate: Date
) {
  const formattedDate = dueDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: `Due date reminder: "${taskTitle}" — FlowBoard`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 12px; padding: 12px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">F</span>
          </div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px;">
          Due Date Reminder
        </h1>
        <p style="color: #6b7280; text-align: center; margin-bottom: 16px;">
          Hi ${name}, this is a reminder that the following task is due soon:
        </p>
        <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; color: #111827; margin: 0 0 8px 0;">${taskTitle}</h2>
          <p style="color: #ef4444; font-weight: 600; margin: 0;">Due: ${formattedDate}</p>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          Log in to FlowBoard to manage this task.
        </p>
      </div>
    `,
  });
}

export async function sendBoardInviteEmail(
  to: string,
  inviterName: string,
  boardTitle: string,
  role: string
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const roleLabel = role === "EDITOR" ? "Editor (can edit)" : "Viewer (view only)";

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: `${inviterName} shared "${boardTitle}" with you — FlowBoard`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 12px; padding: 12px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">F</span>
          </div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px;">
          Board Shared With You
        </h1>
        <p style="color: #6b7280; text-align: center; margin-bottom: 24px;">
          <strong>${inviterName}</strong> shared the board <strong>"${boardTitle}"</strong> with you.
        </p>
        <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
          <p style="color: #7c3aed; font-weight: 600; margin: 0;">Your role: ${roleLabel}</p>
        </div>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${clientUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; font-weight: 600;
                    padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Open FlowBoard
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendWorkspaceInviteEmail(
  to: string,
  inviterName: string,
  workspaceName: string
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: `You've been invited to "${workspaceName}" — FlowBoard`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 12px; padding: 12px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">F</span>
          </div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px;">
          Workspace Invitation
        </h1>
        <p style="color: #6b7280; text-align: center; margin-bottom: 32px;">
          ${inviterName} has invited you to join the workspace <strong>"${workspaceName}"</strong>.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${clientUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; font-weight: 600;
                    padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Open FlowBoard
          </a>
        </div>
      </div>
    `,
  });
}
