import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ownPatient, randomCode } from "../lib/helpers";
import { certInput, mailDoc } from "../lib/documents";
import { CERT_TYPES } from "../../shared/utils";

export const certificates = {
  list: authed.handler(async ({ context }) => {
    const rows = await db
      .select({ c: s.certificates, p: s.patients })
      .from(s.certificates)
      .innerJoin(s.patients, eq(s.patients.id, s.certificates.patientId))
      .where(eq(s.certificates.doctorId, context.user.id))
      .orderBy(desc(s.certificates.date))
      .limit(300);
    return rows.map(({ c, p }) => ({ ...c, patientName: `${p.firstName} ${p.lastName}`, patientIdNumber: p.idNumber }));
  }),
  create: authed.input(certInput).handler(async ({ context, input }) => {
    await ownPatient(context.user.id, input.patientId);
    const [c] = await db
      .insert(s.certificates)
      .values({ ...input, doctorId: context.user.id, date: new Date(), code: `CM-${randomCode(8)}` })
      .returning();
    return c;
  }),
  remove: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db.delete(s.certificates).where(and(eq(s.certificates.id, input.id), eq(s.certificates.doctorId, context.user.id)));
    return { ok: true };
  }),
  email: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const [c] = await db.select().from(s.certificates).where(and(eq(s.certificates.id, input.id), eq(s.certificates.doctorId, context.user.id)));
    if (!c) throw new ORPCError("NOT_FOUND");
    return mailDoc(context.user, c.patientId, "certificado", c.code, CERT_TYPES[c.type] ?? "Certificado médico");
  }),
};
