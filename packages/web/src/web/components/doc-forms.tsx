import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Btn, Field, Input, Modal, Select, Textarea } from "./ui/kit";
import { useToast } from "./toast";
import { DiagnosisPicker, PatientPicker, type Diagnosis } from "./pickers";
import { useCertificateMutations, usePrescriptionMutations } from "../queries/clinical";
import { cn } from "../lib/utils";
import { CERT_TYPES, addDaysYmd, numberToWords, ymd } from "../../shared/utils";

export const pdfHref = (kind: "receta" | "certificado", code: string) => `/api/pdf/${kind}/${code}`;

type Ctx = { patient?: { id: number; name: string }; consultationId?: number | null; diagnoses?: Diagnosis[] };

type Item = {
  genericName: string;
  concentration: string;
  form: string;
  quantity: string;
  route: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
};
const emptyItem: Item = { genericName: "", concentration: "", form: "Tableta", quantity: "", route: "Oral", dose: "", frequency: "", duration: "", instructions: "" };
const FORMS = ["Tableta", "Cápsula", "Tableta recubierta", "Jarabe", "Suspensión", "Solución oral", "Solución inyectable", "Ampolla", "Crema", "Gel", "Parche", "Inhalador", "Gotas", "Sobre"];
const ROUTES = ["Oral", "Sublingual", "Intravenosa", "Intramuscular", "Subcutánea", "Tópica", "Inhalatoria", "Transdérmica", "Oftálmica", "Rectal"];

export function PrescriptionFormModal({ open, onClose, ctx }: { open: boolean; onClose: () => void; ctx?: Ctx }) {
  const [patient, setPatient] = React.useState<{ id: number; name: string } | null>(null);
  const [diagnoses, setDiagnoses] = React.useState<Diagnosis[]>([]);
  const [items, setItems] = React.useState<Item[]>([{ ...emptyItem }]);
  const [recommendations, setRecommendations] = React.useState("");
  const [warningSigns, setWarningSigns] = React.useState("");
  const [nextVisit, setNextVisit] = React.useState("");
  const { create } = usePrescriptionMutations();
  const toast = useToast();

  React.useEffect(() => {
    if (!open) return;
    setPatient(ctx?.patient ?? null);
    setDiagnoses(ctx?.diagnoses ?? []);
    setItems([{ ...emptyItem }]);
    setRecommendations("");
    setWarningSigns("");
    setNextVisit("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setItem = (i: number, k: keyof Item, v: string) => setItems((x) => x.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  const submit = async () => {
    if (!patient) return toast.error("Selecciona un paciente");
    const valid = items.filter((i) => i.genericName.trim());
    if (!valid.length) return toast.error("Agrega al menos un medicamento");
    if (valid.some((i) => !(Number(i.quantity) >= 1))) return toast.error("Indica la cantidad de cada medicamento");
    try {
      const rx = await create.mutateAsync({
        patientId: patient.id,
        consultationId: ctx?.consultationId ?? null,
        diagnoses,
        items: valid.map((i) => ({
          ...i,
          quantity: Math.floor(Number(i.quantity)),
          quantityWords: numberToWords(Number(i.quantity)),
        })),
        recommendations,
        warningSigns,
        nextVisit: nextVisit || null,
      });
      toast.ok(`Receta ${rx.code} emitida`);
      window.open(pdfHref("receta", rx.code), "_blank");
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva receta médica"
      subtitle="Formato MSP · nombre genérico, concentración, forma farmacéutica y cantidad en números y letras"
      wide="xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={submit} loading={create.isPending} arrow>
            Emitir receta
          </Btn>
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Paciente">
            {ctx?.patient ? <Input value={ctx.patient.name} disabled /> : <PatientPicker value={patient} onChange={setPatient} />}
          </Field>
          <Field label="Próximo control">
            <Input type="date" value={nextVisit} min={ymd(new Date())} onChange={(e) => setNextVisit(e.target.value)} />
          </Field>
        </div>
        <Field label="Diagnóstico (CIE-10)">
          <DiagnosisPicker value={diagnoses} onChange={setDiagnoses} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label-xs">Medicamentos (Rp.)</p>
            <Btn size="sm" variant="soft" onClick={() => setItems((x) => [...x, { ...emptyItem }])}>
              <Plus /> Agregar
            </Btn>
          </div>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-[15px] text-navy">{i + 1}.</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-crimson">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-12">
                  <Field label="Nombre genérico (DCI)" className="md:col-span-4">
                    <Input value={it.genericName} onChange={(e) => setItem(i, "genericName", e.target.value)} placeholder="Losartán" />
                  </Field>
                  <Field label="Concentración" className="md:col-span-2">
                    <Input value={it.concentration} onChange={(e) => setItem(i, "concentration", e.target.value)} placeholder="50 mg" />
                  </Field>
                  <Field label="Forma farmacéutica" className="md:col-span-3">
                    <Select value={it.form} onChange={(e) => setItem(i, "form", e.target.value)}>
                      {FORMS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cantidad" hint={Number(it.quantity) >= 1 ? `(${numberToWords(Number(it.quantity))})` : undefined} className="md:col-span-3">
                    <Input type="number" min={1} value={it.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} placeholder="30" />
                  </Field>
                  <Field label="Vía" className="md:col-span-2">
                    <Select value={it.route} onChange={(e) => setItem(i, "route", e.target.value)}>
                      {ROUTES.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Dosis" className="md:col-span-3">
                    <Input value={it.dose} onChange={(e) => setItem(i, "dose", e.target.value)} placeholder="1 tableta" />
                  </Field>
                  <Field label="Frecuencia" className="md:col-span-3">
                    <Input value={it.frequency} onChange={(e) => setItem(i, "frequency", e.target.value)} placeholder="cada 12 horas" />
                  </Field>
                  <Field label="Duración" className="md:col-span-4">
                    <Input value={it.duration} onChange={(e) => setItem(i, "duration", e.target.value)} placeholder="30 días" />
                  </Field>
                  <Field label="Indicaciones" className="md:col-span-12">
                    <Input value={it.instructions} onChange={(e) => setItem(i, "instructions", e.target.value)} placeholder="Tomar después del desayuno y la cena" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Recomendaciones no farmacológicas">
            <Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Dieta hiposódica, caminata 30 min diarios…" />
          </Field>
          <Field label="Signos de alarma">
            <Textarea value={warningSigns} onChange={(e) => setWarningSigns(e.target.value)} placeholder="Dolor torácico, disnea, palpitaciones…" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export function CertificateFormModal({ open, onClose, ctx }: { open: boolean; onClose: () => void; ctx?: Ctx }) {
  const today = ymd(new Date());
  const [patient, setPatient] = React.useState<{ id: number; name: string } | null>(null);
  const [type, setType] = React.useState<"reposo" | "asistencia" | "salud">("reposo");
  const [diagnoses, setDiagnoses] = React.useState<Diagnosis[]>([]);
  const [restDays, setRestDays] = React.useState("3");
  const [startDate, setStartDate] = React.useState(today);
  const [timeFrom, setTimeFrom] = React.useState("");
  const [timeTo, setTimeTo] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [observations, setObservations] = React.useState("");
  const { create } = useCertificateMutations();
  const toast = useToast();

  React.useEffect(() => {
    if (!open) return;
    setPatient(ctx?.patient ?? null);
    setDiagnoses(ctx?.diagnoses ?? []);
    setType("reposo");
    setRestDays("3");
    setStartDate(ymd(new Date()));
    setTimeFrom("");
    setTimeTo("");
    setInstitution("");
    setObservations("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const days = Math.max(1, Math.floor(Number(restDays) || 1));
  const endDate = addDaysYmd(startDate || today, days - 1);

  const submit = async () => {
    if (!patient) return toast.error("Selecciona un paciente");
    try {
      const c = await create.mutateAsync({
        patientId: patient.id,
        consultationId: ctx?.consultationId ?? null,
        type,
        diagnoses,
        restDays: type === "reposo" ? days : null,
        startDate: type === "reposo" ? startDate : null,
        endDate: type === "reposo" ? endDate : null,
        timeFrom: type === "asistencia" ? timeFrom || null : null,
        timeTo: type === "asistencia" ? timeTo || null : null,
        institution,
        observations,
      });
      toast.ok(`Certificado ${c.code} emitido`);
      window.open(pdfHref("certificado", c.code), "_blank");
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo certificado médico"
      wide
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={submit} loading={create.isPending} arrow>
            Emitir certificado
          </Btn>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CERT_TYPES) as (keyof typeof CERT_TYPES)[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setType(k as typeof type)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                type === k ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40",
              )}
            >
              <span className="block font-display text-[17px] font-light capitalize">{k}</span>
              <span className={cn("text-[11.5px]", type === k ? "text-white/70" : "text-muted-foreground")}>{CERT_TYPES[k].replace("Certificado de ", "")}</span>
            </button>
          ))}
        </div>
        <Field label="Paciente">
          {ctx?.patient ? <Input value={ctx.patient.name} disabled /> : <PatientPicker value={patient} onChange={setPatient} />}
        </Field>
        {type !== "salud" && (
          <Field label="Diagnóstico (CIE-10)">
            <DiagnosisPicker value={diagnoses} onChange={setDiagnoses} />
          </Field>
        )}
        {type === "reposo" && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Días de reposo" hint={`(${numberToWords(days)})`}>
              <Input type="number" min={1} max={365} value={restDays} onChange={(e) => setRestDays(e.target.value)} />
            </Field>
            <Field label="Desde">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Hasta">
              <Input type="date" value={endDate} disabled />
            </Field>
          </div>
        )}
        {type === "asistencia" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora de llegada">
              <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
            </Field>
            <Field label="Hora de salida">
              <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label="Dirigido a (institución / empresa)" hint="Opcional. Por defecto: “A quien interese”">
          <Input value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </Field>
        <Field label={type === "salud" ? "Observaciones / aptitud" : "Observaciones"}>
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder={type === "salud" ? "Apto para realizar actividad física…" : ""}
          />
        </Field>
      </div>
    </Modal>
  );
}
