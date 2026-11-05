import { z } from "zod";
import { eq } from "drizzle-orm";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ensureProfile } from "../lib/helpers";
import { publicUrl, s3 } from "../lib/s3";
import { emailEnabled } from "../services/email";

const profileInput = z.object({
  title: z.string(),
  fullName: z.string().min(2),
  specialty: z.string(),
  cedula: z.string(),
  senescytReg: z.string(),
  acessReg: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  city: z.string(),
  bio: z.string(),
  signatureUrl: z.string().nullable(),
  stampUrl: z.string().nullable(),
  consultationFee: z.number().min(0),
  slotMinutes: z.number().int().min(10).max(180),
  bookingEnabled: z.boolean(),
  color: z.string(),
});

export const profile = {
  me: authed.handler(async ({ context }) => {
    const p = await ensureProfile(context.user);
    return { ...p, emailEnabled: emailEnabled() };
  }),
  update: authed.input(profileInput.partial()).handler(async ({ context, input }) => {
    await ensureProfile(context.user);
    const [p] = await db
      .update(s.doctorProfiles)
      .set(input)
      .where(eq(s.doctorProfiles.userId, context.user.id))
      .returning();
    return p;
  }),
  schedules: authed.handler(async ({ context }) => {
    await ensureProfile(context.user);
    return db.select().from(s.schedules).where(eq(s.schedules.doctorId, context.user.id));
  }),
  setSchedules: authed
    .input(
      z.array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      ),
    )
    .handler(async ({ context, input }) => {
      await db.delete(s.schedules).where(eq(s.schedules.doctorId, context.user.id));
      const rows = input.filter((r) => r.startTime < r.endTime).map((r) => ({ ...r, doctorId: context.user.id }));
      if (rows.length) await db.insert(s.schedules).values(rows);
      return { ok: true };
    }),
  presign: authed
    .input(z.object({ filename: z.string(), contentType: z.string() }))
    .handler(async ({ context, input }) => {
      const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `doctors/${context.user.id}/${Date.now()}-${safe}`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: input.contentType, ACL: "public-read" }),
        { expiresIn: 600, signableHeaders: new Set(["x-amz-acl"]) },
      );
      return { url, key, publicUrl: publicUrl(key) };
    }),
};
