import * as React from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowUpRight, CalendarPlus, Stethoscope, UserPlus } from "lucide-react";
import { useDashboard } from "../queries/reports";
import { useProfile } from "../queries/profile";
import { Btn, Card, Empty, PageHeader, Skeleton, StatusDot } from "../components/ui/kit";
import { AppointmentFormModal, PatientFormModal } from "../components/forms";
import { APPT_STATUS, fmtDateLong, fmtMoney, hm } from "../../shared/utils";

export default function Dashboard() {
  const q = useDashboard();
  const profile = useProfile();
  const [newAppt, setNewAppt] = React.useState(false);
  const [newPat, setNewPat] = React.useState(false);
  const d = q.data;
  const hour = Number(hm(new Date()).slice(0, 2));
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const active = d?.today.filter((a) => a.status !== "cancelada") ?? [];
  const done = active.filter((a) => a.status === "atendida").length;
  const next = active.find((a) => a.status === "agendada" || a.status === "confirmada");

  return (
    <>
      <PageHeader
        eyebrow={fmtDateLong(new Date())}
        title={
          <>
            {greet},
            <br />
            <span className="text-navy">{profile.data ? `${profile.data.title} ${profile.data.fullName.split(" ")[0]}` : "…"}</span>
          </>
        }
        actions={
          <>
            <Btn variant="outline" onClick={() => setNewPat(true)}>
              <UserPlus /> Paciente
            </Btn>
            <Btn onClick={() => setNewAppt(true)}>
              <CalendarPlus /> Nueva cita
            </Btn>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: "Citas hoy", v: d ? active.length : null },
          { l: "Atendidas", v: d ? `${done}/${active.length}` : null },
          { l: "Ingresos hoy", v: d ? fmtMoney(d.todayRevenue) : null, sub: d && d.todayPending > 0 ? `${fmtMoney(d.todayPending)} pendiente` : undefined },
          { l: "Pacientes", v: d ? d.totalPatients : null },
        ].map((k) => (
          <Card key={k.l} className="p-5">
            <p className="label-xs">{k.l}</p>
            {k.v === null ? <Skeleton className="mt-3 h-9 w-20" /> : <p className="mt-2 font-display text-[38px] font-extralight leading-none tracking-tight">{k.v}</p>}
            {k.sub && <p className="mt-1 text-[12px] text-warning">{k.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-[22px] font-light">Agenda de hoy</h2>
            <Link to="/app/agenda" className="flex items-center gap-1 text-[13px] text-navy hover:underline">
              Ver agenda <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          {q.isLoading ? (
            <div className="space-y-2 p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !d?.today.length ? (
            <Empty icon={<CalendarPlus />} title="Sin citas para hoy" text="Agenda una cita o comparte tu página de reservas." action={<Btn size="sm" onClick={() => setNewAppt(true)}>Nueva cita</Btn>} />
          ) : (
            <ul className="divide-y divide-border">
              {d.today.map((a) => {
                const st = APPT_STATUS[a.status];
                return (
                  <li key={a.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-14 shrink-0">
                      <p className="font-display text-[22px] font-light leading-none">{hm(a.startsAt)}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{hm(a.endsAt)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/pacientes/${a.patient.id}`} className="block truncate text-[14.5px] font-medium hover:text-navy">
                        {a.patient.firstName} {a.patient.lastName}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <StatusDot color={st.color} label={st.label} />
                        {a.reason && <span className="truncate text-[12.5px] text-muted-foreground">{a.reason}</span>}
                        {a.patient.allergies && (
                          <span className="flex items-center gap-1 text-[12px] text-crimson">
                            <AlertTriangle className="size-3" /> Alergias
                          </span>
                        )}
                      </div>
                    </div>
                    {a.status !== "atendida" && a.status !== "cancelada" && (
                      <Link to={`/app/consulta/${a.patient.id}?appointmentId=${a.id}`}>
                        <Btn size="sm" variant={a.id === next?.id ? "ink" : "outline"}>
                          <Stethoscope /> Atender
                        </Btn>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {next && (
            <div className="iridescent relative overflow-hidden rounded-[20px] p-6 text-ink">
              <p className="label-xs !text-ink/60">Siguiente paciente</p>
              <p className="mt-3 font-display text-[30px] font-light leading-tight">
                {next.patient.firstName} {next.patient.lastName}
              </p>
              <p className="text-[13px] text-ink/70">
                {hm(next.startsAt)} · {next.reason || "Consulta"}
              </p>
              <Link to={`/app/consulta/${next.patient.id}?appointmentId=${next.id}`}>
                <Btn className="mt-5" arrow>
                  Iniciar consulta
                </Btn>
              </Link>
            </div>
          )}
          <Card className="overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-display text-[20px] font-light">Próximos 7 días</h2>
            </div>
            {!d?.upcoming.length ? (
              <p className="px-6 py-8 text-center text-[13px] text-muted-foreground">{q.isLoading ? "Cargando…" : "Nada programado."}</p>
            ) : (
              <ul className="divide-y divide-border">
                {d.upcoming.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px]">
                        {a.patient.firstName} {a.patient.lastName}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", weekday: "short", day: "numeric", month: "short" }).format(a.startsAt)} · {hm(a.startsAt)}
                      </p>
                    </div>
                    <StatusDot color={APPT_STATUS[a.status].color} label={APPT_STATUS[a.status].label} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <AppointmentFormModal open={newAppt} onClose={() => setNewAppt(false)} />
      <PatientFormModal open={newPat} onClose={() => setNewPat(false)} />
    </>
  );
}
