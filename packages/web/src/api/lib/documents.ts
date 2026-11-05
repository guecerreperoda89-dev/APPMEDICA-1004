import { z } from "zod";
import { appUrl, ensureProfile, ownPatient } from "./helpers";
import { diagnosisSchema } from "../routes/consultations";
import { emailLayout, sendEmail } from "../services/email";

const rxItem = z.object({
  genericName: z.string().min(1),
  concentration: z.string().default(""),
  form: z.string().default(""),
  quantity: z.number().int().min(1),
  quantityWords: z.string().default(""),
  route: z.string().default("Oral"),
  dose: z.string().default(""),
  frequency: z.string().default(""),
  duration: z.string().default(""),
  instructions: z.string().default(""),
});

export const rxInput = z.object({
  patientId: z.number(),
  consultationId: z.number().nullable().optional(),
  diagnoses: z.array(diagnosisSchema).default([]),
  items: z.array(rxItem).min(1),
  recommendations: z.string().default(""),
  warningSigns: z.string().default(""),
  nextVisit: z.string().nullable().optional(),
});

export const certInput = z.object({
  patientId: z.number(),
  consultationId: z.number().nullable().optional(),
  type: z.enum(["reposo", "asistencia", "salud"]),
  diagnoses: z.array(diagnosisSchema).default([]),
  restDays: z.number().int().min(1).max(365).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  timeFrom: z.string().nullable().optional(),
  timeTo: z.string().nullable().optional(),
  institution: z.string().default(""),
  observations: z.string().default(""),
});

export const pdfUrl = (kind: "receta" | "certificado", code: string) => `/api/pdf/${kind}/${code}`;

export async function mailDoc(doctor: { id: string; name: string; email: string }, patientId: number, kind: "receta" | "certificado", code: string, title: string) {
  const p = await ownPatient(doctor.id, patientId);
  if (!p.email) return { sent: false, reason: "El paciente no tiene email registrado" };
  const prof = await ensureProfile(doctor);
  const link = `${appUrl()}${pdfUrl(kind, code)}`;
  return sendEmail({
    to: p.email,
    subject: `${title} · ${prof.title} ${prof.fullName}`,
    replyTo: prof.email || undefined,
    html: emailLayout(
      title,
      `<p style="line-height:1.6;color:#374151">Hola ${p.firstName}, ${prof.title} ${prof.fullName} te envía tu documento médico. Puedes descargarlo en PDF:</p>
       <p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#151B2E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Descargar PDF</a></p>
       <p style="font-size:12px;color:#6B7280">Código de verificación: <b>${code}</b></p>`,
    ),
  });
}

