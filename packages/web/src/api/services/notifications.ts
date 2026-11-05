import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "../database";
import * as s from "../database/schema";
import { appUrl } from "../lib/helpers";
import { emailLayout, sendEmail, emailEnabled } from "./email";
import { fmtDateLong, fmtMoney, hm } from "../../shared/utils";

async function load(appointmentId: number) {
  const [a] = await db.select().from(s.appointments).where(eq(s.appointments.id, appointmentId));
  if (!a) return null;
  const [p] = await db.select().from(s.patients).where(eq(s.patients.id, a.patientId));
  const [d] = await db.select().from(s.doctorProfiles).where(eq(s.doctorProfiles.userId, a.doctorId));
  return { a, p, d };
}

function detailBlock(a: typeof s.appointments.$inferSelect, d: typeof s.doctorProfiles.$inferSelect) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#F4F5F8;border-radius:14px;padding:18px;margin:18px 0">
  <tr><td style="padding:6px 18px;font-size:12px;color:#6B7280;letter-spacing:1px">FECHA</td><td style="padding:6px 18px;font-weight:700">${fmtDateLong(a.startsAt)}</td></tr>
  <tr><td style="padding:6px 18px;font-size:12px;color:#6B7280;letter-spacing:1px">HORA</td><td style="padding:6px 18px;font-weight:700">${hm(a.startsAt)}</td></tr>
  <tr><td style="padding:6px 18px;font-size:12px;color:#6B7280;letter-spacing:1px">MÉDICO</td><td style="padding:6px 18px;font-weight:700">${d.title} ${d.fullName} · ${d.specialty}</td></tr>
  ${d.address ? `<tr><td style="padding:6px 18px;font-size:12px;color:#6B7280;letter-spacing:1px">LUGAR</td><td style="padding:6px 18px">${d.address}${d.city ? ", " + d.city : ""}</td></tr>` : ""}
  ${a.price ? `<tr><td style="padding:6px 18px;font-size:12px;color:#6B7280;letter-spacing:1px">VALOR</td><td style="padding:6px 18px">${fmtMoney(a.price)}</td></tr>` : ""}
  </table>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#151B2E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px">${label}</a>`;
}

export async function sendConfirmation(appointmentId: number) {
  const x = await load(appointmentId);
  if (!x || !x.p?.email || !x.d) return { sent: false, reason: "El paciente no tiene email" };
  const { a, p, d } = x;
  return sendEmail({
    to: p.email,
    subject: `Cita agendada · ${fmtDateLong(a.startsAt)} ${hm(a.startsAt)}`,
    replyTo: d.email || undefined,
    html: emailLayout(
      `Hola ${p.firstName}, tu cita está agendada`,
      `<p style="line-height:1.6;color:#374151">Te esperamos en SINCRONIA. Por favor llega 10 minutos antes con tu cédula.</p>${detailBlock(a, d)}${button(`${appUrl()}/cita/${a.publicToken}`, "Ver o cancelar mi cita")}`,
    ),
  });
}

export async function sendReminder(appointmentId: number) {
  const x = await load(appointmentId);
  if (!x || !x.p?.email || !x.d) return { sent: false, reason: "El paciente no tiene email" };
  const { a, p, d } = x;
  const r = await sendEmail({
    to: p.email,
    subject: `Recordatorio: tu cita es mañana a las ${hm(a.startsAt)}`,
    replyTo: d.email || undefined,
    html: emailLayout(
      `${p.firstName}, te recordamos tu cita`,
      `<p style="line-height:1.6;color:#374151">Tienes una consulta programada. Si no puedes asistir, cancélala para liberar el espacio a otro paciente.</p>${detailBlock(a, d)}${button(`${appUrl()}/cita/${a.publicToken}`, "Confirmar o cancelar")}`,
    ),
  });
  if (r.sent) await db.update(s.appointments).set({ reminderSentAt: new Date() }).where(eq(s.appointments.id, a.id));
  return r;
}

/** Envía recordatorios a citas dentro de las próximas 24 h que aún no lo recibieron. */
export async function runReminderSweep() {
  if (!emailEnabled()) return 0;
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 3600 * 1000);
  const due = await db
    .select({ id: s.appointments.id })
    .from(s.appointments)
    .where(
      and(
        gte(s.appointments.startsAt, now),
        lte(s.appointments.startsAt, until),
        isNull(s.appointments.reminderSentAt),
        inArray(s.appointments.status, ["agendada", "confirmada"]),
      ),
    );
  let n = 0;
  for (const d of due) {
    const r = await sendReminder(d.id).catch(() => ({ sent: false }));
    if (r.sent) n++;
  }
  return n;
}

const g = globalThis as unknown as { __sincroniaReminderTimer?: ReturnType<typeof setInterval> };
export function startReminderScheduler() {
  if (g.__sincroniaReminderTimer) return;
  g.__sincroniaReminderTimer = setInterval(() => {
    runReminderSweep().catch((e) => console.error("reminder sweep", e));
  }, 10 * 60 * 1000);
  setTimeout(() => runReminderSweep().catch(() => {}), 15000);
}
