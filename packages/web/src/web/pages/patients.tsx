import * as React from "react";
import { Link, useLocation } from "wouter";
import { AlertTriangle, Search, UserPlus, Users } from "lucide-react";
import { usePatients } from "../queries/patients";
import { Btn, Card, Empty, Input, PageHeader, Skeleton } from "../components/ui/kit";
import { PatientFormModal } from "../components/forms";
import { ageFrom, fmtDateShort } from "../../shared/utils";

export default function Patients() {
  const [q, setQ] = React.useState("");
  const [dq, setDq] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDq(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  const list = usePatients(dq || undefined);
  const [open, setOpen] = React.useState(false);
  const [, nav] = useLocation();

  return (
    <>
      <PageHeader
        eyebrow="Pacientes"
        title="Historias clínicas"
        actions={
          <Btn onClick={() => setOpen(true)}>
            <UserPlus /> Nuevo paciente
          </Btn>
        }
      />
      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, apellido o cédula…" className="h-12 rounded-full pl-11" />
      </div>

      <Card className="overflow-hidden">
        {list.isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !list.data?.length ? (
          <Empty
            icon={<Users />}
            title={dq ? "Sin resultados" : "Aún no tienes pacientes"}
            text={dq ? "Prueba con otro nombre o número." : "Crea tu primer paciente o recibe reservas en línea."}
            action={!dq && <Btn size="sm" onClick={() => setOpen(true)}>Crear paciente</Btn>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Paciente", "Identificación", "Edad", "Teléfono", "Seguro", "Última consulta"].map((h) => (
                    <th key={h} className="label-xs px-5 py-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.map((p) => {
                  const age = ageFrom(p.birthDate);
                  return (
                    <tr key={p.id} className="hover:bg-surface/60">
                      <td className="px-5 py-3">
                        <Link to={`/app/pacientes/${p.id}`} aria-label={`Abrir ficha de ${p.firstName} ${p.lastName}`} className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-soft font-display text-[13px] text-navy">
                            {p.firstName[0]}
                            {p.lastName[0]}
                          </span>
                          <span>
                            <span className="block font-medium">
                              {p.lastName} {p.firstName}
                            </span>
                            {p.allergies && (
                              <span className="flex items-center gap-1 text-[11.5px] text-crimson">
                                <AlertTriangle className="size-3" /> {p.allergies.slice(0, 40)}
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono text-[12.5px]">
                        {p.idNumber}
                        <span className="ml-1.5 font-sans text-[11px] text-muted-foreground">{p.idType === "cedula" ? "CI" : "PAS"}</span>
                      </td>
                      <td className="px-5 py-3">{age !== null ? `${age} años` : "—"}</td>
                      <td className="px-5 py-3">{p.phone || "—"}</td>
                      <td className="px-5 py-3">{p.insurance || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.lastVisit ? fmtDateShort(p.lastVisit) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <PatientFormModal open={open} onClose={() => setOpen(false)} onSaved={(p) => nav(`/app/pacientes/${p.id}`)} />
    </>
  );
}
