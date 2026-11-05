import * as React from "react";
import { Link } from "wouter";
import { Bell, CalendarPlus, ChevronLeft, ChevronRight, Pencil, Stethoscope, Trash2, Wallet } from "lucide-react";
import { useAppointments, useRemind, useRemoveAppointment, useUpdateAppointment } from "../queries/appointments";
import { Btn, Card, Empty, Loading, Modal, PageHeader, StatusDot } from "../components/ui/kit";
import { AppointmentFormModal, PaymentFormModal, type ApptEdit } from "../components/forms";
import { useToast } from "../components/toast";
import { cn } from "../lib/utils";
import { APPT_STATUS, TZ, addDaysYmd, ecDate, fmtMoney, hm, timeToMin, weekdayEC, ymd } from "../../shared/utils";

type View = "dia" | "semana" | "lista";
type Appt = NonNullable<ReturnType<typeof useAppointments>["data"]>[number];

const START_H = 7;
const END_H = 21;
const PX = 56; // px por hora

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-EC", { timeZone: TZ, ...o });

function weekStart(date: string) {
  const wd = weekdayEC(ecDate(date, "12:00"));
  return addDaysYmd(date, wd === 0 ? -6 : 1 - wd);
}

export default function Agenda() {
  const [view, setView] = React.useState<View>(() => (window.innerWidth < 768 ? "dia" : "semana"));
  const [date, setDate] = React.useState(ymd(new Date()));
  const [newOpen, setNewOpen] = React.useState<{ date?: string; time?: string } | null>(null);
  const [edit, setEdit] = React.useState<ApptEdit | null>(null);
  const [sel, setSel] = React.useState<Appt | null>(null);

  const from = view === "dia" ? date : view === "semana" ? weekStart(date) : date;
  const to = view === "dia" ? date : view === "semana" ? addDaysYmd(from, 6) : addDaysYmd(date, 30);
  const q = useAppointments(from, to);
  const days = view === "semana" ? Array.from({ length: 7 }, (_, i) => addDaysYmd(from, i)) : [date];
  const step = view === "dia" ? 1 : view === "semana" ? 7 : 30;
  const today = ymd(new Date());

  const title =
    view === "dia"
      ? fmt({ weekday: "long", day: "numeric", month: "long" }).format(ecDate(date, "12:00"))
      : view === "semana"
        ? `${fmt({ day: "numeric", month: "short" }).format(ecDate(from, "12:00"))} — ${fmt({ day: "numeric", month: "short", year: "numeric" }).format(ecDate(to, "12:00"))}`
        : `Desde ${fmt({ day: "numeric", month: "long" }).format(ecDate(from, "12:00"))}`;

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title={<span className="capitalize">{title}</span>}
        actions={
          <Btn onClick={() => setNewOpen({ date })}>
            <CalendarPlus /> Nueva cita
          </Btn>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(addDaysYmd(date, -step))} className="grid size-10 place-items-center rounded-full border border-border hover:border-ink/40">
            <ChevronLeft className="size-4" />
          </button>
          <Btn variant={date === today ? "soft" : "outline"} onClick={() => setDate(today)}>
            Hoy
          </Btn>
          <button onClick={() => setDate(addDaysYmd(date, step))} className="grid size-10 place-items-center rounded-full border border-border hover:border-ink/40">
            <ChevronRight className="size-4" />
          </button>
          <input type="date" aria-label="Fecha" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-10 rounded-full border border-border px-4 text-[13px]" />
        </div>
        <div className="flex rounded-full bg-surface p-1">
          {(["dia", "semana", "lista"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("rounded-full px-4 py-1.5 text-[13px] capitalize transition", view === v ? "bg-ink text-white" : "text-ink/70")}>
              {v === "dia" ? "Día" : v}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading && !q.data ? (
        <Loading />
      ) : view === "lista" ? (
        <ListView items={q.data ?? []} onSelect={setSel} />
      ) : (
        <Grid days={days} items={q.data ?? []} onSelect={setSel} onEmpty={(d, t) => setNewOpen({ date: d, time: t })} />
      )}

      <AppointmentFormModal open={!!newOpen} onClose={() => setNewOpen(null)} defaults={newOpen ?? undefined} />
      <AppointmentFormModal open={!!edit} onClose={() => setEdit(null)} edit={edit} />
      <ApptDetail
        appt={sel}
        onClose={() => setSel(null)}
        onEdit={(a) => {
          setSel(null);
          setEdit({
            id: a.id,
            patientId: a.patientId,
            patientName: `${a.patient.firstName} ${a.patient.lastName}`,
            date: ymd(a.startsAt),
            time: hm(a.startsAt),
            duration: Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000),
            reason: a.reason,
            notes: a.notes,
            price: a.price,
          });
        }}
      />
    </>
  );
}

function Grid({ days, items, onSelect, onEmpty }: { days: string[]; items: Appt[]; onSelect: (a: Appt) => void; onEmpty: (d: string, t: string) => void }) {
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const today = ymd(new Date());
  const nowMin = timeToMin(hm(new Date()));
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: days.length > 1 ? 860 : undefined }}>
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
            <div />
            {days.map((d) => (
              <div key={d} className={cn("border-l border-border px-3 py-3", d === today && "bg-navy-soft/50")}>
                <p className="label-xs">{fmt({ weekday: "short" }).format(ecDate(d, "12:00"))}</p>
                <p className={cn("font-display text-[24px] font-light leading-none", d === today && "text-crimson")}>{d.slice(8)}</p>
              </div>
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
            <div>
              {hours.map((h) => (
                <div key={h} style={{ height: PX }} className="pr-2 pt-1 text-right text-[11px] text-muted-foreground">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {days.map((d) => {
              const list = items.filter((a) => ymd(a.startsAt) === d);
              return (
                <div key={d} className={cn("relative border-l border-border", d === today && "bg-navy-soft/20")}>
                  {hours.map((h) => (
                    <button
                      key={h}
                      onClick={() => onEmpty(d, `${String(h).padStart(2, "0")}:00`)}
                      style={{ height: PX }}
                      className="block w-full border-b border-dashed border-border/70 hover:bg-surface/70"
                      aria-label={`Agendar ${d} ${h}:00`}
                    />
                  ))}
                  {d === today && nowMin > START_H * 60 && nowMin < END_H * 60 && (
                    <div className="pointer-events-none absolute inset-x-0 z-10 h-px bg-crimson" style={{ top: ((nowMin - START_H * 60) / 60) * PX }}>
                      <span className="absolute -left-1 -top-1 size-2 rounded-full bg-crimson" />
                    </div>
                  )}
                  {list.map((a) => {
                    const s = timeToMin(hm(a.startsAt));
                    const e = timeToMin(hm(a.endsAt));
                    const top = ((Math.max(s, START_H * 60) - START_H * 60) / 60) * PX;
                    const h = Math.max(((e - s) / 60) * PX - 3, 22);
                    const st = APPT_STATUS[a.status];
                    return (
                      <button
                        key={a.id}
                        onClick={() => onSelect(a)}
                        style={{ top: top + 1, height: h, borderLeftColor: st.color }}
                        className={cn(
                          "absolute inset-x-1 z-[5] overflow-hidden rounded-lg border-l-[3px] bg-white px-2 py-1 text-left shadow-[0_1px_0_rgba(0,0,0,0.04),0_2px_10px_-4px_rgba(21,27,46,0.18)] transition hover:shadow-md",
                          a.status === "cancelada" && "opacity-50 line-through",
                        )}
                      >
                        <p className="truncate text-[12px] font-medium leading-tight">
                          {a.patient.firstName} {a.patient.lastName}
                        </p>
                        <p className="truncate text-[10.5px] text-muted-foreground">
                          {hm(a.startsAt)} · {a.reason || st.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ListView({ items, onSelect }: { items: Appt[]; onSelect: (a: Appt) => void }) {
  if (!items.length) return <Card><Empty icon={<CalendarPlus />} title="Sin citas en los próximos 30 días" /></Card>;
  const groups = new Map<string, Appt[]>();
  for (const a of items) groups.set(ymd(a.startsAt), [...(groups.get(ymd(a.startsAt)) ?? []), a]);
  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([d, list]) => (
        <div key={d}>
          <p className="label-xs mb-2 capitalize">{fmt({ weekday: "long", day: "numeric", month: "long" }).format(ecDate(d, "12:00"))}</p>
          <Card className="divide-y divide-border overflow-hidden">
            {list.map((a) => (
              <button key={a.id} onClick={() => onSelect(a)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-surface/60">
                <span className="w-24 shrink-0 font-display text-[18px] font-light">
                  {hm(a.startsAt)}
                  <span className="text-[12px] text-muted-foreground"> – {hm(a.endsAt)}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  {a.patient.firstName} {a.patient.lastName}
                  {a.reason && <span className="text-muted-foreground"> · {a.reason}</span>}
                </span>
                {a.source === "online" && <span className="rounded-full bg-navy-soft px-2 py-0.5 text-[11px] text-navy">En línea</span>}
                <StatusDot color={APPT_STATUS[a.status].color} label={APPT_STATUS[a.status].label} />
              </button>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

function ApptDetail({ appt, onClose, onEdit }: { appt: Appt | null; onClose: () => void; onEdit: (a: Appt) => void }) {
  const update = useUpdateAppointment();
  const remove = useRemoveAppointment();
  const remind = useRemind();
  const toast = useToast();
  const [pay, setPay] = React.useState(false);
  const [status, setStatus] = React.useState<string>("");
  React.useEffect(() => setStatus(appt?.status ?? ""), [appt]);
  if (!appt && !pay) return null;
  const a = appt;

  const setSt = async (s: keyof typeof APPT_STATUS) => {
    if (!a) return;
    try {
      await update.mutateAsync({ id: a.id, status: s as "agendada" });
      setStatus(s);
      toast.ok(`Cita marcada como ${APPT_STATUS[s].label.toLowerCase()}`);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      {a && (
        <Modal
          open={!!a}
          onClose={onClose}
          title={`${a.patient.firstName} ${a.patient.lastName}`}
          subtitle={`${fmt({ weekday: "long", day: "numeric", month: "long" }).format(a.startsAt)} · ${hm(a.startsAt)}–${hm(a.endsAt)}`}
          footer={
            <>
              <Btn
                variant="danger"
                size="sm"
                loading={remove.isPending}
                onClick={async () => {
                  if (!confirm("¿Eliminar esta cita?")) return;
                  await remove.mutateAsync({ id: a.id });
                  toast.ok("Cita eliminada");
                  onClose();
                }}
              >
                <Trash2 />
              </Btn>
              <div className="flex-1" />
              <Btn variant="outline" size="sm" onClick={() => onEdit(a)}>
                <Pencil /> Editar
              </Btn>
              <Link to={`/app/consulta/${a.patient.id}?appointmentId=${a.id}`}>
                <Btn size="sm">
                  <Stethoscope /> Atender
                </Btn>
              </Link>
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-[13.5px]">
              <Info l="Cédula / Pasaporte" v={a.patient.idNumber} />
              <Info l="Teléfono" v={a.patient.phone || "—"} />
              <Info l="Motivo" v={a.reason || "—"} />
              <Info l="Valor" v={fmtMoney(a.price)} />
              <Info l="Origen" v={a.source === "online" ? "Reserva en línea" : "Manual"} />
              <Info l="Recordatorio" v={a.reminderSentAt ? `Enviado ${fmt({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(a.reminderSentAt)}` : "Pendiente"} />
            </div>
            {a.notes && <p className="rounded-xl bg-surface p-3 text-[13px]">{a.notes}</p>}
            <div>
              <p className="label-xs mb-2">Estado</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(APPT_STATUS).map(([k, s]) => (
                  <button
                    key={k}
                    onClick={() => setSt(k)}
                    disabled={update.isPending}
                    className={cn("rounded-full border px-3 py-1.5 text-[12.5px] transition", status === k ? "text-white" : "border-border hover:border-ink/40")}
                    style={status === k ? { background: s.color, borderColor: s.color } : undefined}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn
                variant="soft"
                size="sm"
                loading={remind.isPending}
                disabled={!a.patient.email}
                onClick={async () => {
                  try {
                    const r = await remind.mutateAsync({ id: a.id });
                    if (r.sent) toast.ok("Recordatorio enviado");
                    else toast.error(r.reason);
                  } catch (e) {
                    toast.error(e);
                  }
                }}
              >
                <Bell /> {a.patient.email ? "Enviar recordatorio" : "Sin correo"}
              </Btn>
              <Btn variant="soft" size="sm" onClick={() => setPay(true)}>
                <Wallet /> Registrar pago
              </Btn>
              <Link to={`/app/pacientes/${a.patient.id}`}>
                <Btn variant="ghost" size="sm" arrow>
                  Ficha del paciente
                </Btn>
              </Link>
            </div>
          </div>
        </Modal>
      )}
      <PaymentFormModal
        open={pay}
        onClose={() => setPay(false)}
        defaults={a ? { patient: { id: a.patient.id, name: `${a.patient.firstName} ${a.patient.lastName}` }, amount: a.price, appointmentId: a.id } : undefined}
      />
    </>
  );
}

function Info({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div>
      <p className="label-xs">{l}</p>
      <p className="mt-0.5">{v}</p>
    </div>
  );
}
