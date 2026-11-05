import * as React from "react";
import { Btn, Field, Input, Modal, Select, Textarea } from "./ui/kit";
import { useToast } from "./toast";
import { PatientPicker } from "./pickers";
import { useCreatePatient, useUpdatePatient } from "../queries/patients";
import { useCreateAppointment, useSlots, useUpdateAppointment } from "../queries/appointments";
import { usePaymentMutations } from "../queries/payments";
import { useProfile } from "../queries/profile";
import { cn } from "../lib/utils";
import { PAY_METHODS, isValidCedula, ymd } from "../../shared/utils";

/* ───────────── Paciente ───────────── */

export type PatientData = {
  idType: "cedula" | "pasaporte";
  idNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  sex: string;
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  occupation: string;
  maritalStatus: string;
  insurance: string;
  emergencyContact: string;
  emergencyPhone: string;
};

const emptyPatient: PatientData = {
  idType: "cedula",
  idNumber: "",
  firstName: "",
  lastName: "",
  birthDate: null,
  sex: "F",
  bloodType: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  occupation: "",
  maritalStatus: "",
  insurance: "",
  emergencyContact: "",
  emergencyPhone: "",
};

export function PatientFormModal({
  open,
  onClose,
  initial,
  patientId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<PatientData>;
  patientId?: number;
  onSaved?: (p: { id: number }) => void;
}) {
  const [f, setF] = React.useState<PatientData>({ ...emptyPatient, ...initial } as PatientData);
  const [tried, setTried] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setF({ ...emptyPatient, ...initial } as PatientData);
      setTried(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const create = useCreatePatient();
  const update = useUpdatePatient();
  const toast = useToast();
  const set = <K extends keyof PatientData>(k: K, v: PatientData[K]) => setF((x) => ({ ...x, [k]: v }));

  const idErr =
    f.idType === "cedula" && f.idNumber && !isValidCedula(f.idNumber)
      ? "Cédula inválida (verificación módulo 10)"
      : tried && !f.idNumber
        ? "Requerido"
        : undefined;

  const submit = async () => {
    setTried(true);
    if (!f.idNumber || !f.firstName || !f.lastName || idErr) return;
    try {
      const data = { ...f, birthDate: f.birthDate || null };
      const p = patientId ? await update.mutateAsync({ id: patientId, data }) : await create.mutateAsync(data);
      toast.ok(patientId ? "Paciente actualizado" : "Paciente creado");
      onSaved?.(p);
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={patientId ? "Editar paciente" : "Nuevo paciente"}
      subtitle="Datos de filiación (Formulario MSP 001)"
      wide
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={submit} loading={create.isPending || update.isPending}>
            Guardar
          </Btn>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Tipo de documento">
          <Select value={f.idType} onChange={(e) => set("idType", e.target.value as PatientData["idType"])}>
            <option value="cedula">Cédula</option>
            <option value="pasaporte">Pasaporte</option>
          </Select>
        </Field>
        <Field label="Número" error={idErr} className="md:col-span-2">
          <Input
            value={f.idNumber}
            inputMode={f.idType === "cedula" ? "numeric" : "text"}
            maxLength={f.idType === "cedula" ? 10 : 20}
            onChange={(e) => set("idNumber", f.idType === "cedula" ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase())}
            placeholder={f.idType === "cedula" ? "1712345678" : "A1234567"}
          />
        </Field>
        <Field label="Nombres" error={tried && !f.firstName ? "Requerido" : undefined}>
          <Input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Apellidos" error={tried && !f.lastName ? "Requerido" : undefined}>
          <Input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Fecha de nacimiento">
          <Input type="date" value={f.birthDate ?? ""} max={ymd(new Date())} onChange={(e) => set("birthDate", e.target.value || null)} />
        </Field>
        <Field label="Sexo">
          <Select value={f.sex} onChange={(e) => set("sex", e.target.value)}>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </Select>
        </Field>
        <Field label="Grupo sanguíneo">
          <Select value={f.bloodType} onChange={(e) => set("bloodType", e.target.value)}>
            <option value="">—</option>
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
        <Field label="Estado civil">
          <Select value={f.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
            <option value="">—</option>
            {["Soltero/a", "Casado/a", "Unión libre", "Divorciado/a", "Viudo/a"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
        <Field label="Teléfono">
          <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="099 123 4567" />
        </Field>
        <Field label="Correo" className="md:col-span-2">
          <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="paciente@correo.com" />
        </Field>
        <Field label="Ciudad">
          <Input value={f.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Dirección" className="md:col-span-2">
          <Input value={f.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Ocupación">
          <Input value={f.occupation} onChange={(e) => set("occupation", e.target.value)} />
        </Field>
        <Field label="Seguro / convenio" className="md:col-span-2">
          <Input value={f.insurance} onChange={(e) => set("insurance", e.target.value)} placeholder="IESS, privado, ninguno…" />
        </Field>
        <Field label="Contacto de emergencia" className="md:col-span-2">
          <Input value={f.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} />
        </Field>
        <Field label="Teléfono emergencia">
          <Input value={f.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ───────────── Cita ───────────── */

export type ApptEdit = {
  id: number;
  patientId: number;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  notes: string;
  price: number;
};

export function AppointmentFormModal({
  open,
  onClose,
  edit,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  edit?: ApptEdit | null;
  defaults?: { date?: string; time?: string; patient?: { id: number; name: string } };
}) {
  const profile = useProfile();
  const [patient, setPatient] = React.useState<{ id: number; name: string } | null>(null);
  const [date, setDate] = React.useState(ymd(new Date()));
  const [time, setTime] = React.useState("");
  const [duration, setDuration] = React.useState(30);
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const slots = useSlots(date);
  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const toast = useToast();

  React.useEffect(() => {
    if (!open) return;
    if (edit) {
      setPatient({ id: edit.patientId, name: edit.patientName });
      setDate(edit.date);
      setTime(edit.time);
      setDuration(edit.duration);
      setReason(edit.reason);
      setNotes(edit.notes);
      setPrice(String(edit.price));
    } else {
      setPatient(defaults?.patient ?? null);
      setDate(defaults?.date ?? ymd(new Date()));
      setTime(defaults?.time ?? "");
      setDuration(profile.data?.slotMinutes ?? 30);
      setReason("");
      setNotes("");
      setPrice(profile.data ? String(profile.data.consultationFee) : "");
      setNotify(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!patient) return toast.error("Selecciona un paciente");
    if (!date || !/^\d{2}:\d{2}$/.test(time)) return toast.error("Indica fecha y hora");
    try {
      if (edit) {
        await update.mutateAsync({ id: edit.id, date, time, duration, reason, notes, price: Number(price) || 0 });
        toast.ok("Cita actualizada");
      } else {
        await create.mutateAsync({ patientId: patient.id, date, time, duration, reason, notes, price: Number(price) || 0, notify });
        toast.ok("Cita agendada");
      }
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  const free = slots.data ?? [];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={edit ? "Editar cita" : "Nueva cita"}
      wide
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={submit} loading={create.isPending || update.isPending}>
            {edit ? "Guardar cambios" : "Agendar"}
          </Btn>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Paciente" className="md:col-span-2">
          {edit ? <Input value={patient?.name ?? ""} disabled /> : <PatientPicker value={patient} onChange={setPatient} />}
        </Field>
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Duración">
            <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[15, 20, 30, 40, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="md:col-span-2">
          <p className="label-xs mb-2">Horarios libres</p>
          {slots.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Cargando…</p>
          ) : free.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Sin horarios libres según tu agenda. Puedes escribir una hora manualmente.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {free.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTime(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12.5px] transition",
                    time === t ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <Field label="Motivo">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Control, primera vez, electrocardiograma…" />
        </Field>
        <Field label="Valor (USD)">
          <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Notas internas" className="md:col-span-2">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {!edit && (
          <label className="flex items-center gap-2 text-[13px] md:col-span-2">
            <input type="checkbox" aria-label="Enviar confirmación por correo" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-navy" />
            Enviar confirmación por correo al paciente
          </label>
        )}
      </div>
    </Modal>
  );
}

/* ───────────── Pago ───────────── */

export function PaymentFormModal({
  open,
  onClose,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  defaults?: { patient?: { id: number; name: string }; amount?: number; appointmentId?: number; concept?: string };
}) {
  const [patient, setPatient] = React.useState<{ id: number; name: string } | null>(null);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<"efectivo" | "transferencia" | "tarjeta" | "seguro">("efectivo");
  const [status, setStatus] = React.useState<"pagado" | "pendiente">("pagado");
  const [concept, setConcept] = React.useState("Consulta médica");
  const [date, setDate] = React.useState(ymd(new Date()));
  const [notes, setNotes] = React.useState("");
  const { create } = usePaymentMutations();
  const profile = useProfile();
  const toast = useToast();

  React.useEffect(() => {
    if (!open) return;
    setPatient(defaults?.patient ?? null);
    setAmount(String(defaults?.amount ?? profile.data?.consultationFee ?? ""));
    setMethod("efectivo");
    setStatus("pagado");
    setConcept(defaults?.concept ?? "Consulta médica");
    setDate(ymd(new Date()));
    setNotes("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!patient) return toast.error("Selecciona un paciente");
    const a = Number(amount);
    if (!(a >= 0)) return toast.error("Monto inválido");
    try {
      await create.mutateAsync({ patientId: patient.id, appointmentId: defaults?.appointmentId ?? null, amount: a, method, status, concept, notes, date });
      toast.ok("Pago registrado");
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pago"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={submit} loading={create.isPending}>
            Registrar
          </Btn>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Paciente">
          <PatientPicker value={patient} onChange={setPatient} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto (USD)">
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div>
          <p className="label-xs mb-2">Método</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PAY_METHODS).map(([k, l]) => (
              <button
                type="button"
                key={k}
                onClick={() => setMethod(k as typeof method)}
                className={cn("rounded-xl border px-3 py-2.5 text-[13px] transition", method === k ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <Field label="Estado">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
          </Select>
        </Field>
        <Field label="Concepto">
          <Input value={concept} onChange={(e) => setConcept(e.target.value)} />
        </Field>
        <Field label="Notas">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="N.º de transferencia, aseguradora…" />
        </Field>
      </div>
    </Modal>
  );
}
