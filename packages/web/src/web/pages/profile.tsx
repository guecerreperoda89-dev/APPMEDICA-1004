import * as React from "react";
import { Copy, ImageUp, Plus, Trash2 } from "lucide-react";
import { uploadFile, useProfile, useSchedules, useSetSchedules, useUpdateProfile } from "../queries/profile";
import { Btn, Card, Field, Input, Loading, PageHeader, Select, Textarea } from "../components/ui/kit";
import { useToast } from "../components/toast";
import { cn } from "../lib/utils";

type Prof = NonNullable<ReturnType<typeof useProfile>["data"]>;
const WD = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Profile() {
  const q = useProfile();
  if (!q.data) return <Loading />;
  return <ProfileForm p={q.data} />;
}

function ProfileForm({ p }: { p: Prof }) {
  const [f, setF] = React.useState(p);
  React.useEffect(() => setF(p), [p]);
  const update = useUpdateProfile();
  const toast = useToast();
  const set = <K extends keyof Prof>(k: K, v: Prof[K]) => setF((x) => ({ ...x, [k]: v }));
  const bookingUrl = `${window.location.origin}/reservar/${p.id}`;

  const save = async () => {
    try {
      await update.mutateAsync({
        title: f.title,
        fullName: f.fullName,
        specialty: f.specialty,
        cedula: f.cedula,
        senescytReg: f.senescytReg,
        acessReg: f.acessReg,
        phone: f.phone,
        email: f.email,
        address: f.address,
        city: f.city,
        bio: f.bio,
        consultationFee: Number(f.consultationFee) || 0,
        slotMinutes: Number(f.slotMinutes) || 30,
        bookingEnabled: f.bookingEnabled,
      });
      toast.ok("Perfil actualizado");
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Mi perfil"
        title="Datos profesionales"
        actions={
          <Btn onClick={save} loading={update.isPending}>
            Guardar cambios
          </Btn>
        }
      >
        <p className="mt-3 max-w-lg text-[13.5px] text-muted-foreground">Estos datos aparecen en el encabezado de recetas y certificados, y en tu página pública de reservas.</p>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-5 font-display text-[22px] font-light">Identificación</h2>
            <div className="grid gap-4 md:grid-cols-6">
              <Field label="Título" className="md:col-span-1">
                <Select value={f.title} onChange={(e) => set("title", e.target.value)}>
                  {["Dr.", "Dra.", "Lcdo.", "Lcda.", "Psic."].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Nombre completo" className="md:col-span-3">
                <Input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </Field>
              <Field label="Cédula" className="md:col-span-2">
                <Input value={f.cedula} onChange={(e) => set("cedula", e.target.value.replace(/\D/g, ""))} maxLength={10} />
              </Field>
              <Field label="Especialidad" className="md:col-span-2">
                <Input value={f.specialty} onChange={(e) => set("specialty", e.target.value)} />
              </Field>
              <Field label="Registro SENESCYT" className="md:col-span-2" hint="N.º de registro del título">
                <Input value={f.senescytReg} onChange={(e) => set("senescytReg", e.target.value)} />
              </Field>
              <Field label="Registro ACESS" className="md:col-span-2" hint="Código de profesional / MSP">
                <Input value={f.acessReg} onChange={(e) => set("acessReg", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-5 font-display text-[22px] font-light">Consultorio</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Teléfono">
                <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Correo de contacto">
                <Input value={f.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Dirección">
                <Input value={f.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label="Ciudad">
                <Input value={f.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Presentación (página pública)" className="md:col-span-2">
                <Textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Cardiólogo clínico con 15 años de experiencia…" />
              </Field>
            </div>
          </Card>

          <ScheduleEditor />
        </div>

        <aside className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-5 font-display text-[22px] font-light">Reservas en línea</h2>
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="text-[13.5px]">Aceptar reservas públicas</span>
              <button
                type="button"
                role="switch"
                aria-checked={!!f.bookingEnabled}
                aria-label="Aceptar reservas públicas"
                onClick={() => set("bookingEnabled", !f.bookingEnabled)}
                className={cn("relative h-6 w-11 rounded-full transition", f.bookingEnabled ? "bg-navy" : "bg-border")}
              >
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", f.bookingEnabled ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor consulta (USD)">
                <Input type="number" min={0} step="0.01" value={f.consultationFee} onChange={(e) => set("consultationFee", e.target.value as unknown as number)} />
              </Field>
              <Field label="Duración de cita">
                <Select value={f.slotMinutes} onChange={(e) => set("slotMinutes", Number(e.target.value))}>
                  {[15, 20, 30, 40, 45, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-5 rounded-xl bg-surface p-3">
              <p className="label-xs mb-1">Tu enlace</p>
              <div className="flex items-center gap-2">
                <a href={bookingUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[12.5px] text-navy hover:underline">
                  {bookingUrl}
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(bookingUrl);
                    toast.ok("Enlace copiado");
                  }}
                  className="grid size-8 place-items-center rounded-full hover:bg-white"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
            {!p.emailEnabled && (
              <p className="mt-4 rounded-xl border border-warning/30 bg-amber-50 p-3 text-[12.5px] text-warning">
                El envío de correos (confirmaciones y recordatorios) aún no está configurado.
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 font-display text-[22px] font-light">Firma y sello</h2>
            <p className="mb-5 text-[12.5px] text-muted-foreground">Se estampan en cada receta y certificado. Usa PNG con fondo transparente para mejores resultados.</p>
            <div className="space-y-4">
              <ImageSlot label="Firma" url={p.signatureUrl} onChange={(url) => update.mutateAsync({ signatureUrl: url })} />
              <ImageSlot label="Sello" url={p.stampUrl} onChange={(url) => update.mutateAsync({ stampUrl: url })} />
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function ImageSlot({ label, url, onChange }: { label: string; url: string | null; onChange: (url: string | null) => Promise<unknown> }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  return (
    <div>
      <p className="label-xs mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <div className="grid h-24 flex-1 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-[repeating-conic-gradient(#f4f5f8_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
          {url ? <img src={url} alt={label} className="max-h-20 max-w-[90%] object-contain" /> : <span className="text-[12px] text-muted-foreground">Sin imagen</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Btn size="sm" variant="outline" loading={busy} onClick={() => ref.current?.click()}>
            <ImageUp /> Subir
          </Btn>
          {url && (
            <Btn size="sm" variant="ghost" className="hover:text-crimson" onClick={() => onChange(null)}>
              <Trash2 /> Quitar
            </Btn>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        aria-label={`Subir ${label}`}
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 3 * 1024 * 1024) return toast.error("La imagen debe pesar menos de 3 MB");
          setBusy(true);
          try {
            const u = await uploadFile(file);
            await onChange(u);
            toast.ok(`${label} actualizada`);
          } catch (err) {
            toast.error(err);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function ScheduleEditor() {
  const q = useSchedules();
  const save = useSetSchedules();
  const toast = useToast();
  const [rows, setRows] = React.useState<{ weekday: number; startTime: string; endTime: string }[]>([]);
  React.useEffect(() => {
    if (q.data) setRows(q.data.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })));
  }, [q.data]);

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[22px] font-light">Horario de atención</h2>
          <p className="text-[12.5px] text-muted-foreground">Define los bloques en que se generan turnos disponibles.</p>
        </div>
        <Btn
          size="sm"
          loading={save.isPending}
          onClick={async () => {
            if (rows.some((r) => r.startTime >= r.endTime)) return toast.error("Revisa los bloques: la hora de inicio debe ser menor a la de fin");
            try {
              await save.mutateAsync(rows);
              toast.ok("Horario guardado");
            } catch (e) {
              toast.error(e);
            }
          }}
        >
          Guardar horario
        </Btn>
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
          const blocks = rows.map((r, i) => ({ ...r, i })).filter((r) => r.weekday === wd);
          return (
            <div key={wd} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
              <span className={cn("w-28 shrink-0 text-[13.5px]", !blocks.length && "text-muted-foreground")}>{WD[wd]}</span>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {blocks.length === 0 && <span className="text-[12.5px] text-muted-foreground">Sin atención</span>}
                {blocks.map((b) => (
                  <div key={b.i} className="flex items-center gap-1 rounded-full border border-border py-1 pl-3 pr-1">
                    <input type="time" aria-label="Hora de inicio" value={b.startTime} onChange={(e) => setRows((x) => x.map((r, j) => (j === b.i ? { ...r, startTime: e.target.value } : r)))} className="bg-transparent text-[12.5px] outline-none" />
                    <span className="text-muted-foreground">–</span>
                    <input type="time" aria-label="Hora de fin" value={b.endTime} onChange={(e) => setRows((x) => x.map((r, j) => (j === b.i ? { ...r, endTime: e.target.value } : r)))} className="bg-transparent text-[12.5px] outline-none" />
                    <button onClick={() => setRows((x) => x.filter((_, j) => j !== b.i))} className="grid size-6 place-items-center rounded-full hover:bg-crimson-soft hover:text-crimson">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setRows((x) => [...x, { weekday: wd, startTime: blocks.length ? "15:00" : "08:00", endTime: blocks.length ? "18:00" : "13:00" }])}
                  className="grid size-7 place-items-center rounded-full border border-dashed border-border text-muted-foreground hover:border-ink/40 hover:text-ink"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
