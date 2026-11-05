import * as React from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowUpRight, Check, Clock, MapPin, Stethoscope } from "lucide-react";
import { useAvailability, useBook, usePublicDoctor, usePublicDoctors } from "../queries/public";
import { Btn, Field, Input, Select, Skeleton, Textarea, Pill } from "../components/ui/kit";
import { useToast } from "../components/toast";
import { cn } from "../lib/utils";
import { ecDate, fmtDateLong, fmtMoney, isValidCedula } from "../../shared/utils";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="iridescent h-[280px] w-full" />
      <div className="relative mx-auto -mt-[220px] max-w-[1080px] px-5 pb-20">
        <div className="mb-10 flex items-center justify-between">
          <Link to="/">
            <img src="/images/logo.png" alt="SINCRONIA" className="h-11" />
          </Link>
          <Pill>Reserva en línea</Pill>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Booking() {
  const { id } = useParams<{ id?: string }>();
  return <Shell>{id ? <DoctorBooking id={Number(id)} /> : <DoctorList />}</Shell>;
}

function DoctorList() {
  const q = usePublicDoctors();
  return (
    <>
      <h1 className="mb-3 font-display text-[52px] font-extralight leading-none tracking-[-0.04em] md:text-[80px]">Agenda tu cita</h1>
      <p className="mb-10 max-w-md text-[15px] text-ink/70">Elige a tu médico para ver los horarios disponibles.</p>
      {q.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !q.data?.length ? (
        <div className="rounded-[22px] border border-border bg-white p-10 text-center text-muted-foreground">Aún no hay médicos con agenda pública.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data.map((d) => (
            <Link key={d.id} to={`/reservar/${d.id}`} className="group flex items-center gap-5 rounded-[22px] border border-border bg-white p-6 transition hover:border-ink/30">
              <div className="grid size-14 shrink-0 place-items-center rounded-full bg-navy font-display text-lg text-white">
                {d.fullName.split(" ").map((x) => x[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[24px] font-light leading-tight">
                  {d.title} {d.fullName}
                </p>
                <p className="text-[13px] text-crimson">{d.specialty}</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {d.city} · {fmtMoney(d.consultationFee)} · {d.slotMinutes} min
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-full border border-border transition group-hover:bg-ink group-hover:text-white">
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function DoctorBooking({ id }: { id: number }) {
  const doctor = usePublicDoctor(id);
  const avail = useAvailability(id);
  const book = useBook();
  const toast = useToast();
  const [date, setDate] = React.useState<string>("");
  const [time, setTime] = React.useState<string>("");
  const [done, setDone] = React.useState<{ token: string; emailSent: boolean } | null>(null);
  const [f, setF] = React.useState({ idType: "cedula" as "cedula" | "pasaporte", idNumber: "", firstName: "", lastName: "", email: "", phone: "", birthDate: "", sex: "F", reason: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  React.useEffect(() => {
    if (!date && avail.data) {
      const first = avail.data.find((d) => d.slots.length);
      if (first) setDate(first.date);
    }
  }, [avail.data, date]);

  const day = avail.data?.find((d) => d.date === date);
  const cedError = f.idType === "cedula" && f.idNumber.length === 10 && !isValidCedula(f.idNumber) ? "Cédula no válida" : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return toast.error("Selecciona fecha y hora");
    if (cedError) return toast.error(cedError);
    try {
      const r = await book.mutateAsync({ doctorId: id, date, time, ...f, idType: f.idType, birthDate: f.birthDate || null });
      setDone(r);
    } catch (err) {
      toast.error(err);
      avail.refetch();
    }
  }

  if (done)
    return (
      <div className="mx-auto max-w-xl rounded-[26px] border border-border bg-white p-10 text-center">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-ink text-white">
          <Check className="size-6" />
        </div>
        <h2 className="font-display text-[40px] font-extralight leading-none tracking-[-0.03em]">¡Cita agendada!</h2>
        <p className="mt-4 text-[15px] text-ink/70">
          {fmtDateLong(date)} a las <b>{time}</b> con {doctor.data?.title} {doctor.data?.fullName}.
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {done.emailSent ? `Te enviamos la confirmación a ${f.email}.` : "Guarda el enlace de tu cita para consultarla o cancelarla."}
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <Link to={`/cita/${done.token}`}>
            <Btn arrow>Ver mi cita</Btn>
          </Link>
          <Link to="/">
            <Btn variant="outline">Inicio</Btn>
          </Link>
        </div>
      </div>
    );

  return (
    <>
      <Link to="/reservar" className="mb-6 inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> Cambiar médico
      </Link>
      {doctor.isLoading ? (
        <Skeleton className="mb-8 h-24" />
      ) : doctor.data ? (
        <div className="mb-10">
          <p className="label-xs mb-2 !text-crimson">{doctor.data.specialty}</p>
          <h1 className="font-display text-[44px] font-extralight leading-none tracking-[-0.035em] md:text-[68px]">
            {doctor.data.title} {doctor.data.fullName}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill><Stethoscope className="size-3.5" /> {fmtMoney(doctor.data.consultationFee)}</Pill>
            <Pill><Clock className="size-3.5" /> {doctor.data.slotMinutes} min</Pill>
            {doctor.data.address && <Pill><MapPin className="size-3.5" /> {doctor.data.address}, {doctor.data.city}</Pill>}
          </div>
          {doctor.data.bio && <p className="mt-5 max-w-2xl text-[14.5px] leading-relaxed text-ink/70">{doctor.data.bio}</p>}
        </div>
      ) : (
        <p className="text-crimson">Médico no disponible.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-[22px] border border-border bg-white p-6">
          <p className="label-xs mb-4">1 · Elige el día</p>
          {avail.isLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              {avail.data?.map((d) => {
                const dt = ecDate(d.date, "12:00");
                const dis = !d.slots.length;
                return (
                  <button
                    key={d.date}
                    disabled={dis}
                    onClick={() => {
                      setDate(d.date);
                      setTime("");
                    }}
                    className={cn(
                      "flex w-[68px] shrink-0 flex-col items-center rounded-2xl border py-3 transition",
                      date === d.date ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40",
                      dis && "cursor-not-allowed opacity-35",
                    )}
                  >
                    <span className="text-[11px] uppercase tracking-wider opacity-70">{dt.toLocaleDateString("es-EC", { weekday: "short", timeZone: "America/Guayaquil" })}</span>
                    <span className="font-display text-[24px] font-light">{dt.toLocaleDateString("es-EC", { day: "numeric", timeZone: "America/Guayaquil" })}</span>
                    <span className="text-[10.5px] opacity-70">{dt.toLocaleDateString("es-EC", { month: "short", timeZone: "America/Guayaquil" })}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="label-xs mb-4 mt-6">2 · Elige la hora</p>
          {!day ? (
            <p className="text-[13px] text-muted-foreground">Selecciona un día disponible.</p>
          ) : !day.slots.length ? (
            <p className="text-[13px] text-muted-foreground">No hay horarios disponibles este día.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {day.slots.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={cn("rounded-full border py-2 text-[13px] transition", time === t ? "border-navy bg-navy text-white" : "border-border hover:border-navy/50")}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {avail.data && !avail.data.some((d) => d.slots.length) && (
            <p className="mt-4 rounded-xl bg-surface p-4 text-[13px] text-muted-foreground">No hay disponibilidad en los próximos 14 días.</p>
          )}
        </div>

        <form onSubmit={submit} className="rounded-[22px] border border-border bg-white p-6">
          <p className="label-xs mb-4">3 · Tus datos</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Documento">
              <Select value={f.idType} onChange={set("idType")}>
                <option value="cedula">Cédula</option>
                <option value="pasaporte">Pasaporte</option>
              </Select>
            </Field>
            <Field label="Número" error={cedError}>
              <Input required value={f.idNumber} onChange={set("idNumber")} maxLength={f.idType === "cedula" ? 10 : 20} inputMode={f.idType === "cedula" ? "numeric" : "text"} />
            </Field>
            <Field label="Nombres">
              <Input required value={f.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Apellidos">
              <Input required value={f.lastName} onChange={set("lastName")} />
            </Field>
            <Field label="Email" className="col-span-2">
              <Input required type="email" value={f.email} onChange={set("email")} />
            </Field>
            <Field label="Celular">
              <Input required value={f.phone} onChange={set("phone")} placeholder="09…" />
            </Field>
            <Field label="Nacimiento">
              <Input type="date" value={f.birthDate} onChange={set("birthDate")} />
            </Field>
            <Field label="Motivo de consulta" className="col-span-2">
              <Textarea rows={2} value={f.reason} onChange={set("reason")} placeholder="Opcional" />
            </Field>
          </div>
          <div className="mt-5 rounded-2xl bg-surface p-4 text-[13px]">
            {date && time ? (
              <>
                <span className="text-muted-foreground">Tu cita:</span> <b>{fmtDateLong(date)}</b> a las <b>{time}</b>
              </>
            ) : (
              <span className="text-muted-foreground">Selecciona fecha y hora</span>
            )}
          </div>
          <Btn type="submit" size="lg" className="mt-4 w-full" arrow loading={book.isPending} disabled={!date || !time}>
            Confirmar cita
          </Btn>
        </form>
      </div>
    </>
  );
}
