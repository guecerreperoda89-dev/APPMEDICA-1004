import { z } from "zod";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ensureProfile, ownPatient, randomToken } from "../lib/helpers";
import { freeSlots, hasClash } from "../lib/slots";
import { sendConfirmation, sendReminder } from "../services/notifications";
import { ecDate } from "../../shared/utils";

const statusEnum = z.enum(["agendada", "confirmada", "atendida", "cancelada", "no_asistio"]);

async function ownAppt(doctorId: string, id: number) {
  const [a] = await db.select().from(s.appointments).where(and(eq(s.appointments.id, id), eq(s.appointments.doctorId, doctorId)));
  if (!a) throw new ORPCError("NOT_FOUND", { message: "Cita no encontrada" });
  return a;
}

export const appointments = {
  range: authed
    .input(z.object({ from: z.string(), to: z.string() }))
    .handler(async ({ context, input }) => {
      const rows = await db
        .select({ a: s.appointments, p: s.patients })
        .from(s.appointments)
        .innerJoin(s.patients, eq(s.patients.id, s.appointments.patientId))
        .where(
          and(
            eq(s.appointments.doctorId, context.user.id),
            gte(s.appointments.startsAt, ecDate(input.from, "00:00")),
            lt(s.appointments.startsAt, ecDate(input.to, "23:59")),
          ),
        )
        .orderBy(asc(s.appointments.startsAt));
      return rows.map(({ a, p }) => ({
        ...a,
        patient: { id: p.id, firstName: p.firstName, lastName: p.lastName, idNumber: p.idNumber, phone: p.phone, email: p.email },
      }));
    }),
  get: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const a = await ownAppt(context.user.id, input.id);
    const p = await ownPatient(context.user.id, a.patientId);
    const [pay] = await db.select().from(s.payments).where(and(eq(s.payments.appointmentId, a.id), eq(s.payments.doctorId, context.user.id)));
    return {
      ...a,
      patient: { id: p.id, firstName: p.firstName, lastName: p.lastName, idNumber: p.idNumber, phone: p.phone, email: p.email, allergies: p.allergies },
      payment: pay ?? null,
    };
  }),
  slots: authed.input(z.object({ date: z.string() })).handler(async ({ context, input }) => {
    const prof = await ensureProfile(context.user);
    return freeSlots(context.user.id, input.date, prof.slotMinutes);
  }),
  create: authed
    .input(
      z.object({
        patientId: z.number(),
        date: z.string(),
        time: z.string(),
        duration: z.number().int().min(5).max(480).optional(),
        reason: z.string().default(""),
        notes: z.string().default(""),
        price: z.number().optional(),
        notify: z.boolean().default(true),
      }),
    )
    .handler(async ({ context, input }) => {
      const prof = await ensureProfile(context.user);
      await ownPatient(context.user.id, input.patientId);
      const startsAt = ecDate(input.date, input.time);
      const endsAt = new Date(startsAt.getTime() + (input.duration ?? prof.slotMinutes) * 60000);
      if (await hasClash(context.user.id, startsAt, endsAt))
        throw new ORPCError("CONFLICT", { message: "Ya existe una cita en ese horario" });
      const [a] = await db
        .insert(s.appointments)
        .values({
          doctorId: context.user.id,
          patientId: input.patientId,
          startsAt,
          endsAt,
          reason: input.reason,
          notes: input.notes,
          price: input.price ?? prof.consultationFee,
          publicToken: randomToken(),
          source: "manual",
        })
        .returning();
      let email: { sent: boolean; reason?: string } = { sent: false };
      if (input.notify) email = await sendConfirmation(a.id);
      return { appointment: a, email };
    }),
  update: authed
    .input(
      z.object({
        id: z.number(),
        status: statusEnum.optional(),
        date: z.string().optional(),
        time: z.string().optional(),
        duration: z.number().optional(),
        reason: z.string().optional(),
        notes: z.string().optional(),
        price: z.number().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const a = await ownAppt(context.user.id, input.id);
      const patch: Partial<typeof s.appointments.$inferInsert> = {};
      if (input.status) patch.status = input.status;
      if (input.reason !== undefined) patch.reason = input.reason;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.price !== undefined) patch.price = input.price;
      if (input.date && input.time) {
        const dur = input.duration ?? (a.endsAt.getTime() - a.startsAt.getTime()) / 60000;
        const startsAt = ecDate(input.date, input.time);
        const endsAt = new Date(startsAt.getTime() + dur * 60000);
        if (await hasClash(context.user.id, startsAt, endsAt, a.id))
          throw new ORPCError("CONFLICT", { message: "Ya existe una cita en ese horario" });
        Object.assign(patch, { startsAt, endsAt, reminderSentAt: null });
      }
      const [u] = await db.update(s.appointments).set(patch).where(eq(s.appointments.id, a.id)).returning();
      return u;
    }),
  remove: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await ownAppt(context.user.id, input.id);
    await db.delete(s.appointments).where(eq(s.appointments.id, input.id));
    return { ok: true };
  }),
  remind: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await ownAppt(context.user.id, input.id);
    return sendReminder(input.id);
  }),
};
