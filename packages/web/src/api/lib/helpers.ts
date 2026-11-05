import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../database";
import * as s from "../database/schema";

export function randomCode(len = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + randomCode(8);
}

export async function ensureProfile(user: { id: string; name: string; email: string }) {
  const [p] = await db.select().from(s.doctorProfiles).where(eq(s.doctorProfiles.userId, user.id));
  if (p) return p;
  const [created] = await db
    .insert(s.doctorProfiles)
    .values({ userId: user.id, fullName: user.name || user.email.split("@")[0], email: user.email })
    .returning();
  // horario por defecto L-V 08:00-13:00 y 15:00-18:00
  const rows = [1, 2, 3, 4, 5].flatMap((weekday) => [
    { doctorId: user.id, weekday, startTime: "08:00", endTime: "13:00" },
    { doctorId: user.id, weekday, startTime: "15:00", endTime: "18:00" },
  ]);
  await db.insert(s.schedules).values(rows);
  return created;
}

export async function ownPatient(doctorId: string, patientId: number) {
  const [p] = await db
    .select()
    .from(s.patients)
    .where(and(eq(s.patients.id, patientId), eq(s.patients.doctorId, doctorId)));
  if (!p) throw new ORPCError("NOT_FOUND", { message: "Paciente no encontrado" });
  return p;
}

export function appUrl(): string {
  return (process.env.WEBSITE_URL || "").replace(/\/$/, "");
}
