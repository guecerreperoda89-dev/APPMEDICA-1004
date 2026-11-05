import { z } from "zod";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ownPatient } from "../lib/helpers";

export const patientInput = z.object({
  idType: z.enum(["cedula", "pasaporte"]),
  idNumber: z.string().min(3),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().nullable().optional(),
  sex: z.string(),
  bloodType: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  occupation: z.string().default(""),
  maritalStatus: z.string().default(""),
  insurance: z.string().default(""),
  emergencyContact: z.string().default(""),
  emergencyPhone: z.string().default(""),
  allergies: z.string().default(""),
  personalHistory: z.string().default(""),
  surgicalHistory: z.string().default(""),
  familyHistory: z.string().default(""),
  habits: z.string().default(""),
  gynecoHistory: z.string().default(""),
  currentMedications: z.string().default(""),
  notes: z.string().default(""),
});

export const patients = {
  list: authed
    .input(z.object({ q: z.string().optional() }).optional())
    .handler(async ({ context, input }) => {
      const q = input?.q?.trim();
      const where = q
        ? and(
            eq(s.patients.doctorId, context.user.id),
            or(
              like(s.patients.firstName, `%${q}%`),
              like(s.patients.lastName, `%${q}%`),
              like(s.patients.idNumber, `%${q}%`),
              like(sql`${s.patients.firstName} || ' ' || ${s.patients.lastName}`, `%${q}%`),
            ),
          )
        : eq(s.patients.doctorId, context.user.id);
      const rows = await db.select().from(s.patients).where(where).orderBy(desc(s.patients.createdAt)).limit(300);
      const last = await db
        .select({ patientId: s.consultations.patientId, last: sql<number>`max(${s.consultations.date})` })
        .from(s.consultations)
        .where(eq(s.consultations.doctorId, context.user.id))
        .groupBy(s.consultations.patientId);
      const map = new Map(last.map((l) => [l.patientId, l.last]));
      return rows.map((r) => ({ ...r, lastVisit: map.get(r.id) ? new Date(Number(map.get(r.id)) * 1000) : null }));
    }),
  get: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const p = await ownPatient(context.user.id, input.id);
    const own = (t: { doctorId: any; patientId: any }) => and(eq(t.doctorId, context.user.id), eq(t.patientId, input.id));
    const [cons, rxs, certs, appts, pays] = await Promise.all([
      db.select().from(s.consultations).where(own(s.consultations)).orderBy(desc(s.consultations.date)),
      db.select().from(s.prescriptions).where(own(s.prescriptions)).orderBy(desc(s.prescriptions.date)),
      db.select().from(s.certificates).where(own(s.certificates)).orderBy(desc(s.certificates.date)),
      db.select().from(s.appointments).where(own(s.appointments)).orderBy(desc(s.appointments.startsAt)),
      db.select().from(s.payments).where(own(s.payments)).orderBy(desc(s.payments.date)),
    ]);
    return { patient: p, consultations: cons, prescriptions: rxs, certificates: certs, appointments: appts, payments: pays };
  }),
  create: authed.input(patientInput).handler(async ({ context, input }) => {
    const [dup] = await db
      .select({ id: s.patients.id })
      .from(s.patients)
      .where(and(eq(s.patients.doctorId, context.user.id), eq(s.patients.idNumber, input.idNumber)));
    if (dup) throw new ORPCError("CONFLICT", { message: "Ya existe un paciente con ese número de identificación" });
    const [p] = await db.insert(s.patients).values({ ...input, doctorId: context.user.id }).returning();
    return p;
  }),
  update: authed
    .input(z.object({ id: z.number(), data: patientInput.partial() }))
    .handler(async ({ context, input }) => {
      await ownPatient(context.user.id, input.id);
      const [p] = await db.update(s.patients).set(input.data).where(eq(s.patients.id, input.id)).returning();
      return p;
    }),
  remove: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await ownPatient(context.user.id, input.id);
    const own = (t: { doctorId: any; patientId: any }) => and(eq(t.doctorId, context.user.id), eq(t.patientId, input.id));
    await Promise.all([
      db.delete(s.consultations).where(own(s.consultations)),
      db.delete(s.prescriptions).where(own(s.prescriptions)),
      db.delete(s.certificates).where(own(s.certificates)),
      db.delete(s.appointments).where(own(s.appointments)),
      db.delete(s.payments).where(own(s.payments)),
    ]);
    await db.delete(s.patients).where(eq(s.patients.id, input.id));
    return { ok: true };
  }),
};
