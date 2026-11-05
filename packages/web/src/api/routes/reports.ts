import { z } from "zod";
import { and, asc, count, eq, gte, lt } from "drizzle-orm";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { addDaysYmd, ecDate, weekdayEC, ymd } from "../../shared/utils";

export const reports = {
  summary: authed.input(z.object({ from: z.string(), to: z.string() })).handler(async ({ context, input }) => {
    const uid = context.user.id;
    const from = ecDate(input.from, "00:00");
    const to = ecDate(addDaysYmd(input.to, 1), "00:00");
    const [appts, pays, cons, newPatients, [{ total }]] = await Promise.all([
      db.select().from(s.appointments).where(and(eq(s.appointments.doctorId, uid), gte(s.appointments.startsAt, from), lt(s.appointments.startsAt, to))),
      db.select().from(s.payments).where(and(eq(s.payments.doctorId, uid), gte(s.payments.date, from), lt(s.payments.date, to))),
      db.select().from(s.consultations).where(and(eq(s.consultations.doctorId, uid), gte(s.consultations.date, from), lt(s.consultations.date, to))),
      db.select({ createdAt: s.patients.createdAt }).from(s.patients).where(and(eq(s.patients.doctorId, uid), gte(s.patients.createdAt, from), lt(s.patients.createdAt, to))),
      db.select({ total: count() }).from(s.patients).where(eq(s.patients.doctorId, uid)),
    ]);

    const byStatus: Record<string, number> = { agendada: 0, confirmada: 0, atendida: 0, cancelada: 0, no_asistio: 0 };
    for (const a of appts) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const closed = byStatus.atendida + byStatus.no_asistio;
    const noShowRate = closed ? byStatus.no_asistio / closed : 0;

    const paid = pays.filter((p) => p.status === "pagado");
    const revenue = paid.reduce((a, p) => a + p.amount, 0);
    const pending = pays.filter((p) => p.status === "pendiente").reduce((a, p) => a + p.amount, 0);

    const byMethod: Record<string, number> = {};
    for (const p of paid) byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;

    // ingresos y citas por mes (o por día si el rango < 45 días)
    const days = Math.round((to.getTime() - from.getTime()) / 86400000);
    const keyOf = (d: Date) => (days <= 45 ? ymd(d) : ymd(d).slice(0, 7));
    const series = new Map<string, { key: string; ingresos: number; citas: number }>();
    let cur = input.from;
    while (cur <= input.to) {
      const k = days <= 45 ? cur : cur.slice(0, 7);
      if (!series.has(k)) series.set(k, { key: k, ingresos: 0, citas: 0 });
      cur = addDaysYmd(cur, 1);
    }
    for (const p of paid) {
      const row = series.get(keyOf(p.date));
      if (row) row.ingresos += p.amount;
    }
    for (const a of appts) {
      if (a.status === "cancelada") continue;
      const row = series.get(keyOf(a.startsAt));
      if (row) row.citas += 1;
    }

    const diagCount = new Map<string, { code: string; name: string; n: number }>();
    for (const c of cons)
      for (const d of c.diagnoses) {
        const k = d.code || d.name;
        const e = diagCount.get(k) ?? { code: d.code, name: d.name, n: 0 };
        e.n++;
        diagCount.set(k, e);
      }
    const topDiagnoses = [...diagCount.values()].sort((a, b) => b.n - a.n).slice(0, 8);

    const weekdays = [0, 0, 0, 0, 0, 0, 0];
    for (const a of appts) if (a.status !== "cancelada") weekdays[weekdayEC(a.startsAt)]++;
    const online = appts.filter((a) => a.source === "online").length;

    return {
      totals: {
        appointments: appts.length,
        consultations: cons.length,
        newPatients: newPatients.length,
        totalPatients: total,
        revenue,
        pending,
        noShowRate,
        online,
        avgTicket: paid.length ? revenue / paid.length : 0,
      },
      byStatus,
      byMethod,
      series: [...series.values()],
      topDiagnoses,
      weekdays,
      granularity: days <= 45 ? "day" : "month",
    };
  }),
  dashboard: authed.handler(async ({ context }) => {
    const uid = context.user.id;
    const today = ymd(new Date());
    const start = ecDate(today, "00:00");
    const end = ecDate(addDaysYmd(today, 1), "00:00");
    const weekEnd = ecDate(addDaysYmd(today, 7), "00:00");
    const [todayAppts, week, pays, [{ total }]] = await Promise.all([
      db
        .select({ a: s.appointments, p: s.patients })
        .from(s.appointments)
        .innerJoin(s.patients, eq(s.patients.id, s.appointments.patientId))
        .where(and(eq(s.appointments.doctorId, uid), gte(s.appointments.startsAt, start), lt(s.appointments.startsAt, end)))
        .orderBy(asc(s.appointments.startsAt)),
      db
        .select({ a: s.appointments, p: s.patients })
        .from(s.appointments)
        .innerJoin(s.patients, eq(s.patients.id, s.appointments.patientId))
        .where(and(eq(s.appointments.doctorId, uid), gte(s.appointments.startsAt, end), lt(s.appointments.startsAt, weekEnd)))
        .orderBy(asc(s.appointments.startsAt))
        .limit(8),
      db.select().from(s.payments).where(and(eq(s.payments.doctorId, uid), gte(s.payments.date, start), lt(s.payments.date, end))),
      db.select({ total: count() }).from(s.patients).where(eq(s.patients.doctorId, uid)),
    ]);
    const map = (r: { a: typeof s.appointments.$inferSelect; p: typeof s.patients.$inferSelect }) => ({
      ...r.a,
      patient: { id: r.p.id, firstName: r.p.firstName, lastName: r.p.lastName, idNumber: r.p.idNumber, allergies: r.p.allergies },
    });
    return {
      today: todayAppts.map(map),
      upcoming: week.map(map),
      todayRevenue: pays.filter((p) => p.status === "pagado").reduce((a, p) => a + p.amount, 0),
      todayPending: pays.filter((p) => p.status === "pendiente").reduce((a, p) => a + p.amount, 0),
      totalPatients: total,
    };
  }),
};
