import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ownPatient, randomCode } from "../lib/helpers";
import { rxInput, mailDoc } from "../lib/documents";

export const prescriptions = {
  list: authed.handler(async ({ context }) => {
    const rows = await db
      .select({ r: s.prescriptions, p: s.patients })
      .from(s.prescriptions)
      .innerJoin(s.patients, eq(s.patients.id, s.prescriptions.patientId))
      .where(eq(s.prescriptions.doctorId, context.user.id))
      .orderBy(desc(s.prescriptions.date))
      .limit(300);
    return rows.map(({ r, p }) => ({ ...r, patientName: `${p.firstName} ${p.lastName}`, patientIdNumber: p.idNumber }));
  }),
  create: authed.input(rxInput).handler(async ({ context, input }) => {
    await ownPatient(context.user.id, input.patientId);
    const [r] = await db
      .insert(s.prescriptions)
      .values({ ...input, doctorId: context.user.id, date: new Date(), code: `RX-${randomCode(8)}` })
      .returning();
    return r;
  }),
  remove: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db.delete(s.prescriptions).where(and(eq(s.prescriptions.id, input.id), eq(s.prescriptions.doctorId, context.user.id)));
    return { ok: true };
  }),
  email: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const [r] = await db.select().from(s.prescriptions).where(and(eq(s.prescriptions.id, input.id), eq(s.prescriptions.doctorId, context.user.id)));
    if (!r) throw new ORPCError("NOT_FOUND");
    return mailDoc(context.user, r.patientId, "receta", r.code, "Tu receta médica");
  }),
};

