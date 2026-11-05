import * as React from "react";
import { Link, useLocation, useParams } from "wouter";
import { BadgeCheck, SearchX } from "lucide-react";
import { useVerify } from "../queries/public";
import { Btn, Input, Loading } from "../components/ui/kit";
import { CERT_TYPES, fmtDateLong } from "../../shared/utils";

export default function Verify() {
  const { code } = useParams<{ code?: string }>();
  const [, nav] = useLocation();
  const [val, setVal] = React.useState(code ?? "");
  const q = useVerify(code ?? "");
  const d = q.data;
  return (
    <div className="iridescent min-h-screen px-5 py-10">
      <div className="mx-auto max-w-lg">
        <Link to="/">
          <img src="/images/logo.png" alt="SINCRONIA" className="mb-10 h-11" />
        </Link>
        <h1 className="mb-6 font-display text-[48px] font-extralight leading-none tracking-[-0.04em]">Verificar documento</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (val.trim()) nav(`/verificar/${val.trim().toUpperCase()}`);
          }}
          className="mb-6 flex gap-2"
        >
          <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="RX-XXXXXXXX o CM-XXXXXXXX" className="h-12 bg-white" />
          <Btn type="submit" size="lg">Verificar</Btn>
        </form>
        {code &&
          (q.isLoading ? (
            <Loading label="Verificando…" />
          ) : d?.valid ? (
            <div className="rounded-[24px] bg-white p-8">
              <div className="mb-5 flex items-center gap-3 text-success">
                <BadgeCheck className="size-7" />
                <span className="text-[15px] font-medium">Documento auténtico</span>
              </div>
              <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-[14px]">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>{d.kind === "receta" ? "Receta médica" : CERT_TYPES[d.type ?? ""] ?? "Certificado"}</dd>
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-mono">{d.code}</dd>
                <dt className="text-muted-foreground">Fecha</dt>
                <dd>{fmtDateLong(new Date(d.date))}</dd>
                <dt className="text-muted-foreground">Paciente</dt>
                <dd>{d.patient} · {d.patientId}</dd>
                <dt className="text-muted-foreground">Emitido por</dt>
                <dd>{d.doctor}<span className="block text-muted-foreground">{d.specialty}{d.senescyt ? ` · Reg. ${d.senescyt}` : ""}</span></dd>
              </dl>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[24px] bg-white p-8 text-crimson">
              <SearchX className="size-6" /> No encontramos un documento con ese código.
            </div>
          ))}
      </div>
    </div>
  );
}
