import * as React from "react";
import { Link } from "wouter";
import { FileText, Mail, Pill as PillIcon, Plus, Search, Trash2 } from "lucide-react";
import { useCertificates, useCertificateMutations, usePrescriptionMutations, usePrescriptions } from "../queries/clinical";
import { Btn, Card, Empty, Input, PageHeader, Skeleton } from "../components/ui/kit";
import { CertificateFormModal, PrescriptionFormModal, pdfHref } from "../components/doc-forms";
import { useToast } from "../components/toast";
import { CERT_TYPES, fmtDateShort } from "../../shared/utils";

type Row = { id: number; code: string; date: Date; patientId: number; patientName: string; patientIdNumber: string; title: string; sub?: string };

export function DocsPage({ kind }: { kind: "receta" | "certificado" }) {
  const rxQ = usePrescriptions();
  const ctQ = useCertificates();
  const rxM = usePrescriptionMutations();
  const ctM = useCertificateMutations();
  const isRx = kind === "receta";
  const q = isRx ? rxQ : ctQ;
  const m = isRx ? rxM : ctM;
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const rows: Row[] = isRx
    ? (rxQ.data ?? []).map((r) => ({
        ...r,
        title: r.items.map((i) => `${i.genericName} ${i.concentration}`.trim()).join(" · "),
        sub: r.diagnoses.map((d) => d.code || d.name).join(", "),
      }))
    : (ctQ.data ?? []).map((c) => ({
        ...c,
        title: CERT_TYPES[c.type] ?? c.type,
        sub: c.type === "reposo" && c.restDays ? `${c.restDays} días · ${c.startDate ? fmtDateShort(c.startDate) : ""} → ${c.endDate ? fmtDateShort(c.endDate) : ""}` : c.diagnoses.map((d) => d.code || d.name).join(", "),
      }));
  const s = search.trim().toLowerCase();
  const filtered = s ? rows.filter((r) => `${r.patientName} ${r.patientIdNumber} ${r.code} ${r.title}`.toLowerCase().includes(s)) : rows;

  return (
    <>
      <PageHeader
        eyebrow={isRx ? "Documentos · Recetas" : "Documentos · Certificados"}
        title={isRx ? "Recetas médicas" : "Certificados médicos"}
        actions={
          <Btn onClick={() => setOpen(true)}>
            <Plus /> {isRx ? "Nueva receta" : "Nuevo certificado"}
          </Btn>
        }
      >
        <p className="mt-3 max-w-lg text-[13.5px] text-muted-foreground">
          {isRx
            ? "Formato MSP con nombre genérico, concentración, forma farmacéutica y cantidad en letras. Cada PDF lleva firma, sello y código QR de verificación."
            : "Reposo, asistencia y salud. Cada certificado lleva firma, sello y código QR verificable."}
        </p>
      </PageHeader>

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por paciente, código…" className="h-12 rounded-full pl-11" />
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !filtered.length ? (
          <Empty icon={<PillIcon />} title={s ? "Sin resultados" : isRx ? "Aún no has emitido recetas" : "Aún no has emitido certificados"} />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <div className="w-28 shrink-0">
                  <p className="font-mono text-[12px] text-navy">{r.code}</p>
                  <p className="text-[12px] text-muted-foreground">{fmtDateShort(r.date)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/app/pacientes/${r.patientId}`} className="text-[14px] font-medium hover:text-navy">
                    {r.patientName}
                  </Link>
                  <p className="truncate text-[12.5px] text-muted-foreground">
                    {r.title}
                    {r.sub && ` — ${r.sub}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a href={pdfHref(kind, r.code)} target="_blank" rel="noreferrer">
                    <Btn size="sm" variant="outline">
                      <FileText /> PDF
                    </Btn>
                  </a>
                  <Btn
                    size="sm"
                    variant="ghost"
                    title="Enviar por correo"
                    loading={m.email.isPending && m.email.variables?.id === r.id}
                    onClick={async () => {
                      try {
                        const res = await m.email.mutateAsync({ id: r.id });
                        if (res.sent) toast.ok("Enviado por correo");
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
                      await m.remove.mutateAsync({ id: r.id });
                      toast.ok("Documento eliminado");
                    }}
                  >
                    <Trash2 />
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {isRx ? <PrescriptionFormModal open={open} onClose={() => setOpen(false)} /> : <CertificateFormModal open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

export default function Prescriptions() {
  return <DocsPage kind="receta" />;
}
