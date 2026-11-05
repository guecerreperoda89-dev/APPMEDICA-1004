import * as React from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { AlertTriangle, ArrowLeft, FileBadge, HeartPulse, Pill as PillIcon, Save, Trash2 } from "lucide-react";
import { usePatient } from "../queries/patients";
import { useConsultation, useSaveConsultation } from "../queries/clinical";
import { Btn, Card, Field, Input, Loading, Pill, Textarea } from "../components/ui/kit";
import { DiagnosisPicker, type Diagnosis } from "../components/pickers";
import { CertificateFormModal, PrescriptionFormModal } from "../components/doc-forms";
import { useToast } from "../components/toast";
import { cn } from "../lib/utils";
import { ageFrom, bmi, fmtDateLong, ymd } from "../../shared/utils";

type Form = {
  reason: string;
  currentIllness: string;
  systemsReview: string;
  bpSys: string;
  bpDia: string;
  heartRate: string;
  respRate: string;
  temperature: string;
  spo2: string;
  weight: string;
  height: string;
  glucose: string;
  physicalExam: string;
  diagnoses: Diagnosis[];
  plan: string;
  exams: string;
  nextVisit: string;
};
const empty: Form = {
  reason: "",
  currentIllness: "",
  systemsReview: "",
  bpSys: "",
  bpDia: "",
  heartRate: "",
  respRate: "",
  temperature: "",
  spo2: "",
  weight: "",
  height: "",
  glucose: "",
  physicalExam: "",
  diagnoses: [],
  plan: "",
  exams: "",
  nextVisit: "",
};
const NUMS = ["bpSys", "bpDia", "heartRate", "respRate", "temperature", "spo2", "weight", "height", "glucose"] as const;
const num = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? null : Number(s));

function bmiLabel(v: number) {
  if (v < 18.5) return { t: "Bajo peso", c: "text-warning" };
  if (v < 25) return { t: "Normal", c: "text-success" };
  if (v < 30) return { t: "Sobrepeso", c: "text-warning" };
  return { t: "Obesidad", c: "text-crimson" };
}

export default function Consultation() {
  const { patientId, consultationId } = useParams<{ patientId: string; consultationId?: string }>();
  const pid = Number(patientId);
  const cid = consultationId ? Number(consultationId) : 0;
  const search = useSearch();
  const appointmentId = Number(new URLSearchParams(search).get("appointmentId")) || null;
  const patient = usePatient(pid);
  const existing = useConsultation(cid);
  const { create, update, remove } = useSaveConsultation();
  const toast = useToast();
  const [, nav] = useLocation();
  const [f, setF] = React.useState<Form>(empty);
  const [modal, setModal] = React.useState<"rx" | "cert" | null>(null);
  const [loadedFor, setLoadedFor] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!cid) {
      if (loadedFor !== 0) {
        // nueva consulta: precargar talla de la última consulta
        const last = patient.data?.consultations[0];
        setF({ ...empty, height: last?.height ? String(last.height) : "" });
        if (patient.data) setLoadedFor(0);
      }
      return;
    }
    const c = existing.data;
    if (c && loadedFor !== c.id) {
      const out: Form = { ...empty };
      for (const k of Object.keys(empty) as (keyof Form)[]) {
        const v = (c as Record<string, unknown>)[k];
        if (k === "diagnoses") out.diagnoses = c.diagnoses;
        else (out as Record<string, unknown>)[k] = v === null || v === undefined ? "" : String(v);
      }
      setF(out);
      setLoadedFor(c.id);
    }
  }, [cid, existing.data, patient.data, loadedFor]);

  if (patient.isLoading || (cid && existing.isLoading)) return <Loading />;
  if (!patient.data) return <p>Paciente no encontrado.</p>;
  const p = patient.data.patient;
  const name = `${p.firstName} ${p.lastName}`;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const imc = bmi(num(f.weight), num(f.height));

  const payload = () => {
    const out: Record<string, unknown> = {
      reason: f.reason,
      currentIllness: f.currentIllness,
      systemsReview: f.systemsReview,
      physicalExam: f.physicalExam,
      diagnoses: f.diagnoses,
      plan: f.plan,
      exams: f.exams,
      nextVisit: f.nextVisit || null,
    };
    for (const k of NUMS) out[k] = num(f[k]);
    return out as Omit<Form, (typeof NUMS)[number] | "nextVisit"> & Record<(typeof NUMS)[number], number | null> & { nextVisit: string | null };
  };

  const save = async (then?: "rx" | "cert") => {
    try {
      if (cid) {
        await update.mutateAsync({ id: cid, data: payload() });
        toast.ok("Consulta guardada");
        if (then) setModal(then);
      } else {
        const c = await create.mutateAsync({ patientId: pid, appointmentId, ...payload() });
        toast.ok("Consulta registrada");
        nav(`/app/consulta/${pid}/${c.id}`, { replace: true });
        if (then) setTimeout(() => setModal(then), 50);
      }
    } catch (e) {
      toast.error(e);
    }
  };

  const saving = create.isPending || update.isPending;
  const date = cid && existing.data ? existing.data.date : new Date();
  const ctx = { patient: { id: pid, name }, consultationId: cid || null, diagnoses: f.diagnoses };

  return (
    <>
      <Link to={`/app/pacientes/${pid}`} className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> Ficha de {name}
      </Link>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label-xs mb-2">{cid ? "Consulta" : "Nueva consulta"} · {fmtDateLong(date)}</p>
          <h1 className="font-display text-[40px] font-extralight leading-[0.95] tracking-[-0.035em] md:text-[56px]">{name}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill>{p.idNumber}</Pill>
            {ageFrom(p.birthDate) !== null && <Pill>{ageFrom(p.birthDate)} años</Pill>}
            <Pill>{p.sex === "F" ? "F" : "M"}</Pill>
            {p.allergies && (
              <Pill className="border-crimson/30 bg-crimson-soft text-crimson">
                <AlertTriangle className="size-3" /> {p.allergies}
              </Pill>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" onClick={() => save("rx")} disabled={saving}>
            <PillIcon /> Receta
          </Btn>
          <Btn variant="outline" onClick={() => save("cert")} disabled={saving}>
            <FileBadge /> Certificado
          </Btn>
          <Btn onClick={() => save()} loading={saving}>
            <Save /> Guardar
          </Btn>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Section n="1" title="Motivo de consulta">
            <Input value={f.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Dolor torácico, palpitaciones, control de HTA…" />
          </Section>
          <Section n="2" title="Enfermedad o problema actual">
            <Textarea rows={4} value={f.currentIllness} onChange={(e) => set("currentIllness", e.target.value)} placeholder="Cronología, localización, características, intensidad, causa aparente, síntomas asociados…" />
          </Section>
          <Section n="3" title="Revisión actual de órganos y sistemas">
            <Textarea rows={3} value={f.systemsReview} onChange={(e) => set("systemsReview", e.target.value)} placeholder="Cardiovascular, respiratorio, digestivo… (CP / SP)" />
          </Section>

          <Section n="4" title="Signos vitales y antropometría" icon={<HeartPulse className="size-4 text-crimson" />}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Presión arterial">
                <div className="flex items-center gap-1.5">
                  <Input inputMode="numeric" value={f.bpSys} onChange={(e) => set("bpSys", e.target.value)} placeholder="120" />
                  <span className="text-muted-foreground">/</span>
                  <Input inputMode="numeric" value={f.bpDia} onChange={(e) => set("bpDia", e.target.value)} placeholder="80" />
                </div>
              </Field>
              <Vital l="Frec. cardiaca" u="lpm" v={f.heartRate} on={(v) => set("heartRate", v)} warn={(n) => n < 50 || n > 100} />
              <Vital l="Frec. respiratoria" u="rpm" v={f.respRate} on={(v) => set("respRate", v)} warn={(n) => n < 12 || n > 20} />
              <Vital l="Temperatura" u="°C" v={f.temperature} on={(v) => set("temperature", v)} warn={(n) => n >= 37.8 || n < 35.5} />
              <Vital l="SpO₂" u="%" v={f.spo2} on={(v) => set("spo2", v)} warn={(n) => n < 94} />
              <Vital l="Glucemia" u="mg/dL" v={f.glucose} on={(v) => set("glucose", v)} warn={(n) => n > 125 || n < 70} />
              <Vital l="Peso" u="kg" v={f.weight} on={(v) => set("weight", v)} />
              <Vital l="Talla" u="cm" v={f.height} on={(v) => set("height", v)} />
            </div>
            {num(f.bpSys) !== null && num(f.bpSys)! >= 140 && (
              <p className="mt-3 text-[12.5px] text-crimson">PA sistólica ≥ 140 mmHg</p>
            )}
          </Section>

          <Section n="5" title="Examen físico">
            <Textarea rows={4} value={f.physicalExam} onChange={(e) => set("physicalExam", e.target.value)} placeholder="Ruidos cardiacos rítmicos, no soplos. Pulmones ventilados. Pulsos periféricos presentes…" />
          </Section>
          <Section n="6" title="Diagnóstico (CIE-10)">
            <DiagnosisPicker value={f.diagnoses} onChange={(v) => set("diagnoses", v)} />
          </Section>
          <Section n="7" title="Plan de tratamiento">
            <Textarea rows={4} value={f.plan} onChange={(e) => set("plan", e.target.value)} placeholder="Indicaciones, medidas generales, interconsultas…" />
          </Section>
          <div className="grid gap-6 md:grid-cols-2">
            <Section n="8" title="Exámenes solicitados">
              <Textarea rows={3} value={f.exams} onChange={(e) => set("exams", e.target.value)} placeholder="ECG, ecocardiograma, perfil lipídico, troponina…" />
            </Section>
            <Section n="9" title="Próximo control">
              <Input type="date" min={ymd(new Date())} value={f.nextVisit} onChange={(e) => set("nextVisit", e.target.value)} />
            </Section>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className={cn("rounded-[20px] p-6", imc ? "iridescent" : "bg-surface")}>
            <p className="label-xs !text-ink/60">Índice de masa corporal</p>
            <p className="mt-2 font-display text-[56px] font-extralight leading-none tracking-tight">{imc ?? "—"}</p>
            {imc ? <p className={cn("mt-1 text-[13px] font-medium", bmiLabel(imc).c)}>{bmiLabel(imc).t}</p> : <p className="mt-1 text-[12.5px] text-ink/60">Ingresa peso y talla</p>}
          </div>
          <Card className="p-5">
            <p className="label-xs mb-3">Antecedentes</p>
            <dl className="space-y-2.5 text-[13px]">
              {[
                ["Personales", p.personalHistory],
                ["Quirúrgicos", p.surgicalHistory],
                ["Familiares", p.familyHistory],
                ["Medicación", p.currentMedications],
                ["Hábitos", p.habits],
              ].map(([l, v]) => (
                <div key={l}>
                  <dt className="text-[11.5px] text-muted-foreground">{l}</dt>
                  <dd className="whitespace-pre-wrap">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <Link to={`/app/pacientes/${pid}`} className="mt-3 inline-block text-[12.5px] text-navy hover:underline">
              Editar antecedentes
            </Link>
          </Card>
          {cid > 0 && (
            <Btn
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-crimson"
              loading={remove.isPending}
              onClick={async () => {
                if (!confirm("¿Eliminar esta consulta?")) return;
                await remove.mutateAsync({ id: cid });
                toast.ok("Consulta eliminada");
                nav(`/app/pacientes/${pid}`);
              }}
            >
              <Trash2 /> Eliminar consulta
            </Btn>
          )}
        </aside>
      </div>

      <PrescriptionFormModal open={modal === "rx"} onClose={() => setModal(null)} ctx={ctx} />
      <CertificateFormModal open={modal === "cert"} onClose={() => setModal(null)} ctx={ctx} />
    </>
  );
}

function Section({ n, title, icon, children }: { n: string; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5 md:p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="font-display text-[13px] text-crimson">{n.padStart(2, "0")}</span>
        <h2 className="font-display text-[19px] font-light">{title}</h2>
        {icon}
      </div>
      {children}
    </Card>
  );
}

function Vital({ l, u, v, on, warn }: { l: string; u: string; v: string; on: (v: string) => void; warn?: (n: number) => boolean }) {
  const n = num(v);
  const bad = n !== null && warn?.(n);
  return (
    <Field label={l}>
      <div className="relative">
        <Input inputMode="decimal" value={v} onChange={(e) => on(e.target.value.replace(",", "."))} className={cn("pr-14", bad && "border-crimson/50 text-crimson")} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-muted-foreground">{u}</span>
      </div>
    </Field>
  );
}
