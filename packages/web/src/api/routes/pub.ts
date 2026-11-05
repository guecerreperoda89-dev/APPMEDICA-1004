import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as s from "../database/schema";
import { randomToken } from "../lib/helpers";
import { freeSlots, hasClash } from "../lib/slots";
import { sendConfirmation } from "../services/notifications";
import { addDaysYmd, ecDate, isValidCedula, ymd } from "../../shared/utils";

async function doctorById(id: number) {
  const [d] = await db.select().from(s.doctorProfiles).where(and(eq(s.doctorProfiles.id, id), eq(s.doctorProfiles.bookingEnabled, true)));
  if (!d) throw new ORPCError("NOT_FOUND", { message: "Médico no disponible" });
  return d;
}

const pubDoctor = (d: typeof s.doctorProfiles.$inferSelect) => ({
  id: d.id,
  title: d.title,
  fullName: d.fullName,
  specialty: d.specialty,
  bio: d.bio,
  city: d.city,
  address: d.address,
  consultationFee: d.consultationFee,
  slotMinutes: d.slotMinutes,
  color: d.color,
});

export const pub = {
  doctors: base.handler(async () => {
    const rows = await db.select().from(s.doctorProfiles).where(eq(s.doctorProfiles.bookingEnabled, true));
    return rows.map(pubDoctor);
  }),
  doctor: base.input(z.object({ id: z.number() })).handler(async ({ input }) => pubDoctor(await doctorById(input.id))),
  /** Disponibilidad de los próximos N días */
  availability: base
    .input(z.object({ doctorId: z.number(), from: z.string().optional(), days: z.number().int().min(1).max(21).default(14) }))
    .handler(async ({ input }) => {
      const d = await doctorById(input.doctorId);
      const start = input.from ?? ymd(new Date());
      const out: { date: string; slots: string[] }[] = [];
      for (let i = 0; i < input.days; i++) {
        const date = addDaysYmd(start, i);
        out.push({ date, slots: await freeSlots(d.userId, date, d.slotMinutes) });
      }
      return out;
    }),
  book: base
    .input(
      z.object({
        doctorId: z.number(),
        date: z.string(),
        time: z.string(),
        idType: z.enum(["cedula", "pasaporte"]),
        idNumber: z.string().min(5),
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(7),
        birthDate: z.string().nullable().optional(),
        sex: z.string().default("F"),
        reason: z.string().default(""),
      }),
    )
    .handler(async ({ input }) => {
      if (input.idType === "cedula" && !isValidCedula(input.idNumber))
        throw new ORPCError("BAD_REQUEST", { message: "Número de cédula no válido" });
      const d = await doctorById(input.doctorId);
      const slots = await freeSlots(d.userId, input.date, d.slotMinutes);
      if (!slots.includes(input.time)) throw new ORPCError("CONFLICT", { message: "Ese horario ya no está disponible" });
      const startsAt = ecDate(input.date, input.time);
      const endsAt = new Date(startsAt.getTime() + d.slotMinutes * 60000);
      if (await hasClash(d.userId, startsAt, endsAt)) throw new ORPCError("CONFLICT", { message: "Ese horario ya no está disponible" });

      let [patient] = await db
        .select()
        .from(s.patients)
        .where(and(eq(s.patients.doctorId, d.userId), eq(s.patients.idNumber, input.idNumber)));
      if (!patient) {
        [patient] = await db
          .insert(s.patients)
          .values({
            doctorId: d.userId,
            idType: input.idType,
            idNumber: input.idNumber,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            birthDate: input.birthDate ?? null,
            sex: input.sex,
          })
          .returning();
      } else {
        await db.update(s.patients).set({ email: input.email, phone: input.phone }).where(eq(s.patients.id, patient.id));
      }
      const [a] = await db
        .insert(s.appointments)
        .values({
          doctorId: d.userId,
          patientId: patient.id,
          startsAt,
          endsAt,
          reason: input.reason,
          source: "online",
          price: d.consultationFee,
          publicToken: randomToken(),
        })
        .returning();
      const email = await sendConfirmation(a.id).catch(() => ({ sent: false }));
      return { token: a.publicToken, emailSent: email.sent };
    }),
  appointment: base.input(z.object({ token: z.string() })).handler(async ({ input }) => {
    const [a] = await db.select().from(s.appointments).where(eq(s.appointments.publicToken, input.token));
    if (!a) throw new ORPCError("NOT_FOUND", { message: "Cita no encontrada" });
    const [p] = await db.select().from(s.patients).where(eq(s.patients.id, a.patientId));
    const [d] = await db.select().from(s.doctorProfiles).where(eq(s.doctorProfiles.userId, a.doctorId));
    return {
      startsAt: a.startsAt,
      status: a.status,
      reason: a.reason,
      price: a.price,
      patientName: `${p.firstName} ${p.lastName}`,
      doctor: d ? pubDoctor(d) : null,
    };
  }),
  setStatus: base
    .input(z.object({ token: z.string(), status: z.enum(["confirmada", "cancelada"]) }))
    .handler(async ({ input }) => {
      const [a] = await db.select().from(s.appointments).where(eq(s.appointments.publicToken, input.token));
      if (!a) throw new ORPCError("NOT_FOUND");
      if (!["agendada", "confirmada"].includes(a.status)) throw new ORPCError("BAD_REQUEST", { message: "La cita ya no puede modificarse" });
      if (a.startsAt.getTime() < Date.now()) throw new ORPCError("BAD_REQUEST", { message: "La cita ya pasó" });
      await db.update(s.appointments).set({ status: input.status }).where(eq(s.appointments.id, a.id));
      return { ok: true };
    }),
  verify: base.input(z.object({ code: z.string() })).handler(async ({ input }) => {
    const code = input.code.trim().toUpperCase();
    const [rx] = await db.select().from(s.prescriptions).where(eq(s.prescriptions.code, code));
    const [cert] = rx ? [undefined] : await db.select().from(s.certificates).where(eq(s.certificates.code, code));
    const doc = rx ?? cert;
    if (!doc) return { valid: false as const };
    const [p] = await db.select().from(s.patients).where(eq(s.patients.id, doc.patientId));
    const [d] = await db.select().from(s.doctorProfiles).where(eq(s.doctorProfiles.userId, doc.doctorId));
    const initials = p ? `${p.firstName} ${p.lastName.charAt(0)}.` : "";
    return {
      valid: true as const,
      kind: rx ? ("receta" as const) : ("certificado" as const),
      type: cert?.type ?? null,
      code,
      date: doc.date,
      patient: initials,
      patientId: p ? `${p.idNumber.slice(0, 3)}*****${p.idNumber.slice(-2)}` : "",
      doctor: d ? `${d.title} ${d.fullName}` : "",
      specialty: d?.specialty ?? "",
      senescyt: d?.senescytReg ?? "",
    };
  }),
};
