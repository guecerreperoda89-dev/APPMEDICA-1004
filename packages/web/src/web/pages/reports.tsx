import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReport } from "../queries/reports";
import { Card, Input, Loading, PageHeader } from "../components/ui/kit";
import { cn } from "../lib/utils";
import { APPT_STATUS, PAY_METHODS, addDaysYmd, ecDate, fmtMoney, ymd } from "../../shared/utils";

const COLORS = ["#1F3263", "#A51C30", "#6C7FB8", "#E3A3AE"];
const WD = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function Reports() {
  const today = ymd(new Date());
  const presets = [
    { l: "30 días", f: addDaysYmd(today, -29) },
    { l: "90 días", f: addDaysYmd(today, -89) },
    { l: "Este año", f: today.slice(0, 4) + "-01-01" },
    { l: "12 meses", f: addDaysYmd(today, -364) },
  ];
  const [from, setFrom] = React.useState(presets[0].f);
  const [to, setTo] = React.useState(today);
  const q = useReport(from, to);
  const d = q.data;

  const fmtKey = (k: string) =>
    d?.granularity === "day"
      ? new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short" }).format(ecDate(k, "12:00"))
      : new Intl.DateTimeFormat("es-EC", { month: "short", year: "2-digit" }).format(ecDate(k + "-15", "12:00"));

  return (
    <>
      <PageHeader eyebrow="Reportes" title="Indicadores" />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.l}
            onClick={() => {
              setFrom(p.f);
              setTo(today);
            }}
            className={cn("rounded-full border px-4 py-1.5 text-[13px]", from === p.f && to === today ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40")}
          >
            {p.l}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 w-auto rounded-full" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 w-auto rounded-full" />
        </div>
      </div>

      {!d ? (
        <Loading />
      ) : (
        <div className={cn("space-y-6 transition-opacity", q.isFetching && "opacity-60")}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { l: "Ingresos", v: fmtMoney(d.totals.revenue), s: d.totals.pending ? `${fmtMoney(d.totals.pending)} por cobrar` : undefined },
              { l: "Citas", v: d.totals.appointments, s: `${d.totals.online} en línea` },
              { l: "Consultas", v: d.totals.consultations, s: `Ticket prom. ${fmtMoney(d.totals.avgTicket)}` },
              { l: "Pacientes nuevos", v: d.totals.newPatients, s: `${d.totals.totalPatients} en total` },
            ].map((k) => (
              <Card key={k.l} className="p-5">
                <p className="label-xs">{k.l}</p>
                <p className="mt-2 font-display text-[34px] font-extralight leading-none tracking-tight">{k.v}</p>
                {k.s && <p className="mt-1.5 text-[12px] text-muted-foreground">{k.s}</p>}
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-[22px] font-light">Ingresos y citas</h2>
              <span className="label-xs">{d.granularity === "day" ? "por día" : "por mes"}</span>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.series} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F3263" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1F3263" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EEF0F5" vertical={false} />
                  <XAxis dataKey="key" tickFormatter={fmtKey} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#A51C30" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(k) => fmtKey(String(k))}
                    formatter={(v, n) => (n === "ingresos" ? [fmtMoney(Number(v)), "Ingresos"] : [v, "Citas"])}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E6E8EF", fontSize: 12 }}
                  />
                  <Area yAxisId="l" type="monotone" dataKey="ingresos" stroke="#1F3263" strokeWidth={2} fill="url(#g1)" />
                  <Area yAxisId="r" type="monotone" dataKey="citas" stroke="#A51C30" strokeWidth={1.5} fill="transparent" strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <h2 className="mb-4 font-display text-[20px] font-light">Estado de citas</h2>
              <div className="space-y-3">
                {Object.entries(APPT_STATUS).map(([k, s]) => {
                  const n = d.byStatus[k] ?? 0;
                  const pct = d.totals.appointments ? (n / d.totals.appointments) * 100 : 0;
                  return (
                    <div key={k}>
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span>{s.label}</span>
                        <span className="text-muted-foreground">{n}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 text-[12.5px] text-muted-foreground">
                Inasistencia: <b className="text-ink">{Math.round(d.totals.noShowRate * 100)}%</b>
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="mb-2 font-display text-[20px] font-light">Métodos de pago</h2>
              {Object.keys(d.byMethod).length === 0 ? (
                <p className="py-12 text-center text-[13px] text-muted-foreground">Sin cobros en el periodo</p>
              ) : (
                <>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={Object.entries(d.byMethod).map(([k, v]) => ({ name: PAY_METHODS[k], value: v }))} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                          {Object.keys(d.byMethod).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(d.byMethod).map(([k, v], i) => (
                      <div key={k} className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          {PAY_METHODS[k]}
                        </span>
                        <span>{fmtMoney(v)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 font-display text-[20px] font-light">Días con más citas</h2>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[1, 2, 3, 4, 5, 6, 0].map((i) => ({ d: WD[i], n: d.weekdays[i] }))} margin={{ left: -24 }}>
                    <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#F4F5F8" }} contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [v, "Citas"]} />
                    <Bar dataKey="n" fill="#1F3263" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-[22px] font-light">Diagnósticos más frecuentes</h2>
            {d.topDiagnoses.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">Sin diagnósticos registrados en el periodo</p>
            ) : (
              <div className="space-y-2.5">
                {d.topDiagnoses.map((x) => (
                  <div key={x.code + x.name} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 font-mono text-[12px] text-navy">{x.code || "—"}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">{x.name}</span>
                    <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-surface md:block">
                      <div className="h-full rounded-full bg-crimson" style={{ width: `${(x.n / d.topDiagnoses[0].n) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right text-[13px]">{x.n}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
