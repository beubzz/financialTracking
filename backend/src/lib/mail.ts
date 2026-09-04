import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      })
    : null;

export async function sendActionEmail(
  to: string,
  subject: string,
  actionUrl: string,
  actionLabel: string,
) {
  const text = `${actionLabel}: ${actionUrl}`;
  if (!transporter) {
    console.info(`[mail development] ${to} - ${text}`);
    return;
  }
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    text,
    html: `<p>${actionLabel}</p><p><a href="${actionUrl}">${actionUrl}</a></p>`,
  });
}
