import { and, eq, gte, lt, ne } from "drizzle-orm";
import { db } from "../database";
import * as s from "../database/schema";
import { ecDate, minToTime, timeToMin, weekdayEC, addDaysYmd } from "../../shared/utils";

/** Horarios libres de un médico en una fecha (YYYY-MM-DD, hora Ecuador) */
export async function freeSlots(doctorId: string, date: string, slotMinutes: number) {
  const wd = weekdayEC(ecDate(date, "12:00"));
  const blocks = await db
    .select()
    .from(s.schedules)
    .where(and(eq(s.schedules.doctorId, doctorId), eq(s.schedules.weekday, wd)));
  const dayStart = ecDate(date, "00:00");
  const dayEnd = ecDate(addDaysYmd(date, 1), "00:00");
  const appts = await db
    .select({ startsAt: s.appointments.startsAt, endsAt: s.appointments.endsAt })
    .from(s.appointments)
    .where(
      and(
        eq(s.appointments.doctorId, doctorId),
        gte(s.appointments.startsAt, dayStart),
        lt(s.appointments.startsAt, dayEnd),
        ne(s.appointments.status, "cancelada"),
      ),
    );
  const now = Date.now();
  const slots: string[] = [];
  for (const b of blocks.sort((a, c) => a.startTime.localeCompare(c.startTime))) {
    for (let m = timeToMin(b.startTime); m + slotMinutes <= timeToMin(b.endTime); m += slotMinutes) {
      const t = minToTime(m);
      const st = ecDate(date, t).getTime();
      const en = st + slotMinutes * 60000;
      if (st < now + 30 * 60000) continue;
      const clash = appts.some((a) => a.startsAt.getTime() < en && a.endsAt.getTime() > st);
      if (!clash) slots.push(t);
    }
  }
  return slots;
}

export async function hasClash(doctorId: string, start: Date, end: Date, ignoreId?: number) {
  const rows = await db
    .select({ id: s.appointments.id, startsAt: s.appointments.startsAt, endsAt: s.appointments.endsAt })
    .from(s.appointments)
    .where(
      and(
        eq(s.appointments.doctorId, doctorId),
        lt(s.appointments.startsAt, end),
        gte(s.appointments.endsAt, new Date(start.getTime() + 1)),
        ne(s.appointments.status, "cancelada"),
      ),
    );
  return rows.some((r) => r.id !== ignoreId);
}
