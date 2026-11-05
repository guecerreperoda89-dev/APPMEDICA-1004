import * as React from "react";
import { Search, X, Plus } from "lucide-react";
import { Input } from "./ui/kit";
import { usePatients } from "../queries/patients";
import { useCie10 } from "../queries/clinical";
import { cn } from "../lib/utils";

export type Diagnosis = { code: string; name: string; kind: "presuntivo" | "definitivo" };

function useDebounced<T>(v: T, ms = 250) {
  const [d, setD] = React.useState(v);
  React.useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function PatientPicker({
  value,
  onChange,
}: {
  value: { id: number; name: string } | null;
  onChange: (v: { id: number; name: string; email?: string } | null) => void;
}) {
  const [q, setQ] = React.useState("");
  const dq = useDebounced(q);
  const list = usePatients(dq || undefined);
  const [open, setOpen] = React.useState(false);

  if (value)
    return (
      <div className="flex h-10 items-center justify-between rounded-xl border border-navy/30 bg-navy-soft px-3.5 text-[14px] text-navy">
        <span className="truncate font-medium">{value.name}</span>
        <button type="button" onClick={() => onChange(null)} className="grid size-6 place-items-center rounded-full hover:bg-white">
          <X className="size-3.5" />
        </button>
      </div>
    );
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar paciente por nombre o cédula…"
        className="pl-9"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-xl">
          {list.isLoading ? (
            <p className="px-3 py-2 text-[13px] text-muted-foreground">Buscando…</p>
          ) : !list.data?.length ? (
            <p className="px-3 py-2 text-[13px] text-muted-foreground">Sin resultados. Crea el paciente en la sección Pacientes.</p>
          ) : (
            list.data.slice(0, 30).map((p) => (
              <button
                type="button"
                key={p.id}
                onMouseDown={() => onChange({ id: p.id, name: `${p.firstName} ${p.lastName}`, email: p.email })}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-surface"
              >
                <span>
                  {p.firstName} {p.lastName}
                </span>
                <span className="text-[12px] text-muted-foreground">{p.idNumber}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function DiagnosisPicker({ value, onChange }: { value: Diagnosis[]; onChange: (v: Diagnosis[]) => void }) {
  const [q, setQ] = React.useState("");
  const dq = useDebounced(q, 150);
  const res = useCie10(dq);
  const [open, setOpen] = React.useState(false);
  const add = (d: { code: string; name: string }) => {
    if (value.some((x) => x.code === d.code && x.name === d.name)) return;
    onChange([...value, { ...d, kind: "presuntivo" }]);
    setQ("");
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((d, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
              <span className="rounded-md bg-navy-soft px-2 py-0.5 font-mono text-[12px] text-navy">{d.code || "—"}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{d.name}</span>
              <div className="flex rounded-full bg-surface p-0.5 text-[11.5px]">
                {(["presuntivo", "definitivo"] as const).map((k) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => onChange(value.map((x, j) => (j === i ? { ...x, kind: k } : x)))}
                    className={cn("rounded-full px-2.5 py-0.5 capitalize", d.kind === k ? "bg-ink text-white" : "text-muted-foreground")}
                  >
                    {k === "presuntivo" ? "PRE" : "DEF"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-6 place-items-center rounded-full hover:bg-crimson-soft hover:text-crimson">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (res.data?.[0]) add(res.data[0]);
              else if (q.trim()) add({ code: "", name: q.trim() });
            }
          }}
          placeholder="Buscar CIE-10 (ej. I10, hipertensión, angina)…"
          className="pl-9"
        />
        {open && (q || res.data?.length) ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-xl">
            {res.data?.map((d) => (
              <button
                type="button"
                key={d.code}
                onMouseDown={() => add(d)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-surface"
              >
                <span className="w-14 shrink-0 font-mono text-[12px] text-navy">{d.code}</span>
                <span className="truncate">{d.name}</span>
              </button>
            ))}
            {q.trim() && (
              <button type="button" onMouseDown={() => add({ code: "", name: q.trim() })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-crimson hover:bg-crimson-soft">
                <Plus className="size-3.5" /> Usar texto libre: “{q.trim()}”
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
