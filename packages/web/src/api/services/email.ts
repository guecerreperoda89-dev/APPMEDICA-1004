import { Resend } from "resend";

const key = process.env.RESEND_API_KEY;
const resend = key ? new Resend(key) : null;

export function emailEnabled() {
  return !!resend;
}

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  if (!resend) {
    console.log(`[email deshabilitado] → ${opts.to}: ${opts.subject}`);
    return { sent: false as const, reason: "Configura RESEND_API_KEY para enviar emails" };
  }
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "SINCRONIA <onboarding@resend.dev>",
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
  });
  if (error) {
    console.error("email error", error);
    return { sent: false as const, reason: error.message };
  }
  return { sent: true as const };
}

export function emailLayout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F4F5F8;font-family:Helvetica,Arial,sans-serif;color:#151B2E">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;overflow:hidden">
    <tr><td style="background:#1F3263;padding:22px 32px;color:#fff;font-size:20px;font-weight:700;letter-spacing:.5px">SINCRONIA <span style="color:#F2A7B1;font-weight:400;font-size:13px;letter-spacing:2px">CARDIOLOGÍA INTEGRAL</span></td></tr>
    <tr><td style="padding:32px">
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#1F3263">${title}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:18px 32px;border-top:1px solid #E6E8EF;font-size:12px;color:#6B7280">Este es un mensaje automático de SINCRONIA. No respondas a este correo si no es necesario.</td></tr>
  </table></td></tr></table></body></html>`;
}
