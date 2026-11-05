import { Link, useParams } from "wouter";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { usePublicAppointment, useSetPublicStatus } from "../queries/public";
import { Btn, Loading, StatusDot } from "../components/ui/kit";
import { useToast } from "../components/toast";
import { APPT_STATUS, fmtDateLong, fmtMoney, hm } from "../../shared/utils";

export default function PublicAppointment() {
  const { token } = useParams<{ token: string }>();
  const q = usePublicAppointment(token);
  const m = useSetPublicStatus();
  const toast = useToast();
  const act = async (status: "confirmada" | "cancelada") => {
    if (status === "cancelada" && !confirm("¿Seguro que deseas cancelar tu cita?")) return;
    try {
      await m.mutateAsync({ token, status });
      toast.ok(status === "confirmada" ? "Cita confirmada" : "Cita cancelada");
      q.refetch();
    } catch (e) {
      toast.error(e);
    }
  };
  const a = q.data;
  const st = a ? APPT_STATUS[a.status] : null;
  const editable = a && ["agendada", "confirmada"].includes(a.status) && new Date(a.startsAt).getTime() > Date.now();
  return (
    <div className="iridescent min-h-screen px-5 py-10">
      <div className="mx-auto max-w-lg">
        <Link to="/">
          <img src="/images/logo.png" alt="SINCRONIA" className="mb-10 h-11" />
        </Link>
        {q.isLoading ? (
          <Loading />
        ) : !a ? (
          <div className="rounded-[24px] bg-white p-8 text-center">Cita no encontrada.</div>
        ) : (
          <div className="rounded-[26px] bg-white p-8 shadow-sm">
            <p className="label-xs mb-2">Tu cita</p>
            <h1 className="font-display text-[40px] font-extralight leading-none tracking-[-0.03em]">{a.patientName}</h1>
            {st && <div className="mt-3"><StatusDot color={st.color} label={st.label} /></div>}
            <div className="mt-8 space-y-4 border-t border-border pt-6 text-[14px]">
              <p className="flex items-center gap-3"><CalendarDays className="size-4 text-navy" /> {fmtDateLong(new Date(a.startsAt))}</p>
              <p className="flex items-center gap-3"><Clock className="size-4 text-navy" /> {hm(new Date(a.startsAt))}</p>
              {a.doctor && (
                <p className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 text-navy" />
                  <span>
                    {a.doctor.title} {a.doctor.fullName} · {a.doctor.specialty}
                    {a.doctor.address && <span className="block text-muted-foreground">{a.doctor.address}, {a.doctor.city}</span>}
                  </span>
                </p>
              )}
              {a.price > 0 && <p className="text-muted-foreground">Valor de la consulta: {fmtMoney(a.price)}</p>}
            </div>
            {editable && (
              <div className="mt-8 flex gap-2">
                {a.status === "agendada" && (
                  <Btn onClick={() => act("confirmada")} loading={m.isPending} arrow>
                    Confirmar asistencia
                  </Btn>
                )}
                <Btn variant="danger" onClick={() => act("cancelada")} disabled={m.isPending}>
                  Cancelar cita
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
