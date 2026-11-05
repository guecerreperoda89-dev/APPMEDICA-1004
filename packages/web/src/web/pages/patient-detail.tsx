import * as React from "react";
import { Link, useLocation, useParams } from "wouter";
import { AlertTriangle, ArrowLeft, CalendarPlus, FileBadge, FileText, Mail, Pencil, Pill as PillIcon, Stethoscope, Trash2, Wallet } from "lucide-react";
import { usePatient, useRemovePatient, useUpdatePatient } from "../queries/patients";
import { useCertificateMutations, usePrescriptionMutations } from "../queries/clinical";
import { Btn, Card, Empty, Field, Loading, Pill, StatusDot, Textarea } from "../components/ui/kit";
import { AppointmentFormModal, PatientFormModal, PaymentFormModal, type PatientData } from "../components/forms";
import { CertificateFormModal, PrescriptionFormModal, pdfHref } from "../components/doc-forms";
import { useToast } from "../components/toast";
import { cn } from "../lib/utils";
import { APPT_STATUS, CERT_TYPES, PAY_METHODS, ageFrom, bmi, fmtDateLong, fmtDateShort, fmtMoney, hm } from "../../shared/utils";

const TABS = ["Antecedentes", "Consultas", "Recetas", "Certificados", "Citas", "Pagos"] as const;
type Tab = (typeof TABS)[number];

const HISTORY_FIELDS = [
  { k: "allergies", l: "Alergias", ph: "Penicilina, AINEs, mariscos… (o “No refiere”)" },
  { k: "personalHistory", l: "Antecedentes patológicos personales", ph: "HTA, DM2, dislipidemia, IAM previo…" },
  { k: "surgicalHistory", l: "Antecedentes quirúrgicos", ph: "Cateterismo, bypass, colecistectomía…" },
  { k: "familyHistory", l: "Antecedentes familiares", ph: "Padre con cardiopatía isquémica a los 55 años…" },
  { k: "habits", l: "Hábitos", ph: "Tabaco, alcohol, actividad física, dieta…" },
  { k: "currentMedications", l: "Medicación habitual", ph: "Losartán 50 mg c/12h…" },
  { k: "gynecoHistory", l: "Gineco-obstétricos", ph: "G P C A, FUM, menopausia…" },
  { k: "notes", l: "Notas", ph: "" },
] as const;
type HKey = (typeof HISTORY_FIELDS)[number]["k"];

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const pid = Number(id);
  const q = usePatient(pid);
  const [tab, setTab] = React.useState<Tab>("Antecedentes");
  const [modal, setModal] = React.useState<"edit" | "appt" | "rx" | "cert" | "pay" | null>(null);
  const remove = useRemovePatient();
  const toast = useToast();
  const [, nav] = useLocation();

  if (q.isLoading) return <Loading />;
  if (!q.data) return <Empty title="Paciente no encontrado" action={<Link to="/app/pacientes"><Btn size="sm">Volver</Btn></Link>} />;
  const { patient: p, consultations, prescriptions, certificates, appointments, payments } = q.data;
  const name = `${p.firstName} ${p.lastName}`;
  const age = ageFrom(p.birthDate);
  const ctx = { patient: { id: p.id, name }, diagnoses: consultations[0]?.diagnoses ?? [], consultationId: null };
  const counts: Record<Tab, number | null> = {
    Antecedentes: null,
    Consultas: consultations.length,
    Recetas: prescriptions.length,
    Certificados: certificates.length,
    Citas: appointments.length,
    Pagos: payments.length,
  };

  return (
    <>
      <Link to="/app/pacientes" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> Pacientes
      </Link>

      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Pill>
              {p.idType === "cedula" ? "CI" : "Pasaporte"} {p.idNumber}
            </Pill>
            {age !== null && <Pill>{age} años</Pill>}
            <Pill>{p.sex === "F" ? "Femenino" : "Masculino"}</Pill>
            {p.bloodType && <Pill>{p.bloodType}</Pill>}
            {p.insurance && <Pill>{p.insurance}</Pill>}
          </div>
          <h1 className="font-display text-[44px] font-extralight leading-[0.95] tracking-[-0.035em] md:text-[64px]">
            {p.firstName}
            <br />
            <span className="text-navy">{p.lastName}</span>
          </h1>
          <p className="mt-3 text-[13px] text-muted-foreground">
            {[p.phone, p.email, p.city].filter(Boolean).join(" · ") || "Sin datos de contacto"}
          </p>
          {p.allergies && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-crimson-soft px-3.5 py-1.5 text-[12.5px] text-crimson">
              <AlertTriangle className="size-3.5" /> Alergias: {p.allergies}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" size="sm" onClick={() => setModal("edit")}>
            <Pencil /> Datos
          </Btn>
          <Btn variant="outline" size="sm" onClick={() => setModal("appt")}>
            <CalendarPlus /> Cita
          </Btn>
          <Btn variant="outline" size="sm" onClick={() => setModal("rx")}>
            <PillIcon /> Receta
          </Btn>
          <Btn variant="outline" size="sm" onClick={() => setModal("cert")}>
            <FileBadge /> Certificado
          </Btn>
          <Btn variant="outline" size="sm" onClick={() => setModal("pay")}>
            <Wallet /> Pago
          </Btn>
          <Link to={`/app/consulta/${p.id}`}>
            <Btn size="sm">
              <Stethoscope /> Nueva consulta
            </Btn>
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[13.5px] transition",
              tab === t ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink",
            )}
          >
            {t}
            {counts[t] !== null && <span className="ml-1.5 text-[11.5px] text-muted-foreground">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {tab === "Antecedentes" && <HistoryEditor patient={p} />}

      {tab === "Consultas" &&
        (consultations.length === 0 ? (
          <Card>
            <Empty icon={<Stethoscope />} title="Sin consultas registradas" action={<Link to={`/app/consulta/${p.id}`}><Btn size="sm">Nueva consulta</Btn></Link>} />
          </Card>
        ) : (
          <div className="relative space-y-3 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
            {consultations.map((c) => {
              const imc = bmi(c.weight, c.height);
              return (
                <div key={c.id} className="relative pl-8">
                  <span className="absolute left-0 top-6 size-[15px] rounded-full border-[3px] border-white bg-navy shadow" />
                  <Link to={`/app/consulta/${p.id}/${c.id}`}>
                    <Card className="p-5 transition hover:border-ink/30">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-display text-[20px] font-light">{fmtDateLong(c.date)}</p>
                        <span className="text-[12px] text-muted-foreground">{hm(c.date)}</span>
                      </div>
                      {c.reason && <p className="mt-1 text-[13.5px]"><span className="text-muted-foreground">Motivo: </span>{c.reason}</p>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                        {c.bpSys && <span>PA {c.bpSys}/{c.bpDia}</span>}
                        {c.heartRate && <span>FC {c.heartRate}</span>}
                        {c.spo2 && <span>SpO₂ {c.spo2}%</span>}
                        {imc && <span>IMC {imc}</span>}
                      </div>
                      {c.diagnoses.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {c.diagnoses.map((d, i) => (
                            <span key={i} className="rounded-full bg-navy-soft px-2.5 py-0.5 text-[12px] text-navy">
                              {d.code && <b className="mr-1 font-medium">{d.code}</b>}
                              {d.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "Recetas" && <DocList kind="receta" items={prescriptions.map((r) => ({ id: r.id, code: r.code, date: r.date, title: r.items.map((i) => i.genericName).join(", ") }))} onNew={() => setModal("rx")} />}
      {tab === "Certificados" && <DocList kind="certificado" items={certificates.map((c) => ({ id: c.id, code: c.code, date: c.date, title: CERT_TYPES[c.type] + (c.restDays ? ` · ${c.restDays} días` : "") }))} onNew={() => setModal("cert")} />}

      {tab === "Citas" && (
        <Card className="divide-y divide-border overflow-hidden">
          {appointments.length === 0 ? (
            <Empty title="Sin citas" action={<Btn size="sm" onClick={() => setModal("appt")}>Agendar</Btn>} />
          ) : (
            appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-[13.5px]">
                <span>
                  {fmtDateShort(a.startsAt)} · {hm(a.startsAt)}
                  {a.reason && <span className="text-muted-foreground"> · {a.reason}</span>}
                </span>
                <StatusDot color={APPT_STATUS[a.status].color} label={APPT_STATUS[a.status].label} />
              </div>
            ))
          )}
        </Card>
      )}

      {tab === "Pagos" && (
        <Card className="divide-y divide-border overflow-hidden">
          {payments.length === 0 ? (
            <Empty title="Sin pagos registrados" action={<Btn size="sm" onClick={() => setModal("pay")}>Registrar pago</Btn>} />
          ) : (
            payments.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-[13.5px]">
                <span>
                  {fmtDateShort(x.date)} · {x.concept} <span className="text-muted-foreground">· {PAY_METHODS[x.method]}</span>
                </span>
                <span className={cn("font-medium", x.status === "pendiente" && "text-warning")}>
                  {fmtMoney(x.amount)} {x.status === "pendiente" && "(pendiente)"}
                </span>
              </div>
            ))
          )}
        </Card>
      )}

      <div className="mt-14 border-t border-border pt-6">
        <Btn
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-crimson"
          loading={remove.isPending}
          onClick={async () => {
            if (!confirm(`¿Eliminar a ${name} y toda su historia clínica? Esta acción no se puede deshacer.`)) return;
            try {
              await remove.mutateAsync({ id: p.id });
              toast.ok("Paciente eliminado");
              nav("/app/pacientes");
            } catch (e) {
              toast.error(e);
            }
          }}
        >
          <Trash2 /> Eliminar paciente
        </Btn>
      </div>

      <PatientFormModal open={modal === "edit"} onClose={() => setModal(null)} patientId={p.id} initial={p as unknown as Partial<PatientData>} />
      <AppointmentFormModal open={modal === "appt"} onClose={() => setModal(null)} defaults={{ patient: ctx.patient }} />
      <PrescriptionFormModal open={modal === "rx"} onClose={() => setModal(null)} ctx={ctx} />
      <CertificateFormModal open={modal === "cert"} onClose={() => setModal(null)} ctx={ctx} />
      <PaymentFormModal open={modal === "pay"} onClose={() => setModal(null)} defaults={{ patient: ctx.patient }} />
    </>
  );
}

function HistoryEditor({ patient }: { patient: Record<HKey, string> & { id: number } }) {
  const init = React.useMemo(() => Object.fromEntries(HISTORY_FIELDS.map((f) => [f.k, patient[f.k] ?? ""])) as Record<HKey, string>, [patient]);
  const [f, setF] = React.useState(init);
  React.useEffect(() => setF(init), [init]);
  const update = useUpdatePatient();
  const toast = useToast();
  const dirty = HISTORY_FIELDS.some((x) => f[x.k] !== init[x.k]);
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[22px] font-light">Antecedentes</h2>
          <p className="text-[12.5px] text-muted-foreground">Formulario MSP 002 · sección 2</p>
        </div>
        <Btn
          size="sm"
          disabled={!dirty}
          loading={update.isPending}
          onClick={async () => {
            try {
              await update.mutateAsync({ id: patient.id, data: f });
              toast.ok("Antecedentes guardados");
            } catch (e) {
              toast.error(e);
            }
          }}
        >
          Guardar
        </Btn>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {HISTORY_FIELDS.map((x) => (
          <Field key={x.k} label={x.l} className={x.k === "allergies" ? "md:col-span-2" : undefined}>
            <Textarea rows={x.k === "allergies" ? 2 : 3} value={f[x.k]} placeholder={x.ph} onChange={(e) => setF((s) => ({ ...s, [x.k]: e.target.value }))} />
          </Field>
        ))}
      </div>
    </Card>
  );
}

function DocList({ kind, items, onNew }: { kind: "receta" | "certificado"; items: { id: number; code: string; date: Date; title: string }[]; onNew: () => void }) {
  const rx = usePrescriptionMutations();
  const ct = useCertificateMutations();
  const m = kind === "receta" ? rx : ct;
  const toast = useToast();
  if (!items.length)
    return (
      <Card>
        <Empty icon={<FileText />} title={kind === "receta" ? "Sin recetas" : "Sin certificados"} action={<Btn size="sm" onClick={onNew}>Emitir</Btn>} />
      </Card>
    );
  return (
    <Card className="divide-y divide-border overflow-hidden">
      {items.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <span className="font-mono text-[12px] text-navy">{d.code}</span>
          <span className="min-w-0 flex-1 truncate text-[13.5px]">{d.title}</span>
          <span className="text-[12.5px] text-muted-foreground">{fmtDateShort(d.date)}</span>
          <a href={pdfHref(kind, d.code)} target="_blank" rel="noreferrer">
            <Btn size="sm" variant="outline">
              <FileText /> PDF
            </Btn>
          </a>
          <Btn
            size="sm"
            variant="ghost"
            title="Enviar por correo"
            loading={m.email.isPending && m.email.variables?.id === d.id}
            onClick={async () => {
              try {
                const res = await m.email.mutateAsync({ id: d.id });
                if (res.sent) toast.ok("Enviado por correo al paciente");
                else toast.error(res.reason);
              } catch (e) {
                toast.error(e);
              }
            }}
          >
            <Mail />
          </Btn>
          <Btn
            size="sm"
            variant="ghost"
            className="hover:text-crimson"
            onClick={async () => {
              if (!confirm("¿Anular y eliminar este documento?")) return;
              await m.remove.mutateAsync({ id: d.id });
              toast.ok("Documento eliminado");
            }}
          >
            <Trash2 />
          </Btn>
        </div>
      ))}
    </Card>
  );
}
