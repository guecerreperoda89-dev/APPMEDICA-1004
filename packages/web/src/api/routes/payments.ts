import { z } from "zod";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ownPatient } from "../lib/helpers";
import { ecDate } from "../../shared/utils";

const payInput = z.object({
  patientId: z.number(),
  appointmentId: z.number().nullable().optional(),
  date: z.string().optional(),
  amount: z.number().min(0),
  method: z.enum(["efectivo", "transferencia", "tarjeta", "seguro"]),
  status: z.enum(["pagado", "pendiente"]),
  concept: z.string().default("Consulta médica"),
  notes: z.string().default(""),
});

export const payments = {
  list: authed.input(z.object({ from: z.string(), to: z.string() })).handler(async ({ context, input }) => {
    const rows = await db
      .select({ pay: s.payments, p: s.patients })
      .from(s.payments)
      .innerJoin(s.patients, eq(s.patients.id, s.payments.patientId))
      .where(
        and(
          eq(s.payments.doctorId, context.user.id),
          gte(s.payments.date, ecDate(input.from, "00:00")),
          lt(s.payments.date, ecDate(input.to, "23:59")),
        ),
      )
      .orderBy(desc(s.payments.date));
    return rows.map(({ pay, p }) => ({ ...pay, patientName: `${p.firstName} ${p.lastName}`, patientIdNumber: p.idNumber }));
  }),
  create: authed.input(payInput).handler(async ({ context, input }) => {
    await ownPatient(context.user.id, input.patientId);
    const { date, ...rest } = input;
    const now = new Date();
    const d = date ? new Date(ecDate(date, "12:00").getTime()) : now;
    const [p] = await db.insert(s.payments).values({ ...rest, date: d, doctorId: context.user.id }).returning();
    return p;
  }),
  update: authed
    .input(z.object({ id: z.number(), status: z.enum(["pagado", "pendiente"]).optional(), method: payInput.shape.method.optional(), amount: z.number().optional() }))
    .handler(async ({ context, input }) => {
      const { id, ...patch } = input;
      const [p] = await db.update(s.payments).set(patch).where(and(eq(s.payments.id, id), eq(s.payments.doctorId, context.user.id))).returning();
      return p;
    }),
  remove: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db.delete(s.payments).where(and(eq(s.payments.id, input.id), eq(s.payments.doctorId, context.user.id)));
    return { ok: true };
  }),
};
