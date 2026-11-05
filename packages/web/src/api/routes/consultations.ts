import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ownPatient } from "../lib/helpers";
import { searchCie10 } from "../../shared/cie10";

export const diagnosisSchema = z.object({
  code: z.string(),
  name: z.string(),
  kind: z.enum(["presuntivo", "definitivo"]),
});

const consultInput = z.object({
  patientId: z.number(),
  appointmentId: z.number().nullable().optional(),
  date: z.date().optional(),
  reason: z.string().default(""),
  currentIllness: z.string().default(""),
  systemsReview: z.string().default(""),
  bpSys: z.number().nullable().optional(),
  bpDia: z.number().nullable().optional(),
  heartRate: z.number().nullable().optional(),
  respRate: z.number().nullable().optional(),
  temperature: z.number().nullable().optional(),
  spo2: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  glucose: z.number().nullable().optional(),
  physicalExam: z.string().default(""),
  diagnoses: z.array(diagnosisSchema).default([]),
  plan: z.string().default(""),
  exams: z.string().default(""),
  nextVisit: z.string().nullable().optional(),
});

export const consultations = {
  cie10: authed.input(z.object({ q: z.string() })).handler(({ input }) => searchCie10(input.q)),
  get: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const [c] = await db
      .select()
      .from(s.consultations)
      .where(and(eq(s.consultations.id, input.id), eq(s.consultations.doctorId, context.user.id)));
    if (!c) throw new ORPCError("NOT_FOUND");
    return c;
  }),
  create: authed.input(consultInput).handler(async ({ context, input }) => {
    await ownPatient(context.user.id, input.patientId);
    const [c] = await db
      .insert(s.consultations)
      .values({ ...input, date: input.date ?? new Date(), doctorId: context.user.id })
      .returning();
    if (input.appointmentId) {
      await db
        .update(s.appointments)
        .set({ status: "atendida" })
        .where(and(eq(s.appointments.id, input.appointmentId), eq(s.appointments.doctorId, context.user.id)));
    }
    return c;
  }),
  update: authed
    .input(z.object({ id: z.number(), data: consultInput.partial() }))
    .handler(async ({ context, input }) => {
      const [c] = await db
        .update(s.consultations)
        .set(input.data)
        .where(and(eq(s.consultations.id, input.id), eq(s.consultations.doctorId, context.user.id)))
        .returning();
      if (!c) throw new ORPCError("NOT_FOUND");
      return c;
    }),
  remove: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db.delete(s.consultations).where(and(eq(s.consultations.id, input.id), eq(s.consultations.doctorId, context.user.id)));
    return { ok: true };
  }),
};
