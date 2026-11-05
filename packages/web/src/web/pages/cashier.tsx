import * as React from "react";
import { Link } from "wouter";
import { Check, Plus, Printer, Trash2, Wallet } from "lucide-react";
import { usePaymentMutations, usePayments } from "../queries/payments";
import { Btn, Card, Empty, Input, PageHeader, Skeleton } from "../components/ui/kit";
import { PaymentFormModal } from "../components/forms";
import { useToast } from "../components/toast";
import { cn } from "../lib/utils";
import { PAY_METHODS, addDaysYmd, fmtDateShort, fmtMoney, hm, ymd } from "../../shared/utils";

export default function Cashier() {
  const today = ymd(new Date());
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);
  const q = usePayments(from, to);
  const { update, remove } = usePaymentMutations();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const rows = q.data ?? [];
  const paid = rows.filter((r) => r.status === "pagado");
  const total = paid.reduce((a, r) => a + r.amount, 0);
  const pending = rows.filter((r) => r.status === "pendiente").reduce((a, r) => a + r.amount, 0);
  const byMethod = Object.keys(PAY_METHODS).map((k) => ({ k, v: paid.filter((r) => r.method === k).reduce((a, r) => a + r.amount, 0) }));

  const presets = [
    { l: "Hoy", f: today, t: today },
    { l: "Ayer", f: addDaysYmd(today, -1), t: addDaysYmd(today, -1) },
    { l: "7 días", f: addDaysYmd(today, -6), t: today },
    { l: "Este mes", f: today.slice(0, 8) + "01", t: today },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Caja"
        title={from === to ? (from === today ? "Cierre del día" : `Caja ${fmtDateShort(from)}`) : "Movimientos"}
        actions={
          <>
            <Btn variant="outline" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Btn>
            <Btn onClick={() => setOpen(true)}>
              <Plus /> Registrar pago
            </Btn>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        {presets.map((p) => (
          <button
            key={p.l}
            onClick={() => {
              setFrom(p.f);
              setTo(p.t);
            }}
            className={cn("rounded-full border px-4 py-1.5 text-[13px]", from === p.f && to === p.t ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40")}
          >
            {p.l}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 w-auto rounded-full" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 w-auto rounded-full" />
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1.3fr_2fr]">
        <div className="rounded-[20px] bg-ink p-6 text-white">
          <p className="label-xs !text-white/50">Total cobrado</p>
          <p className="mt-2 font-display text-[54px] font-extralight leading-none tracking-tight">{fmtMoney(total)}</p>
          <p className="mt-2 text-[13px] text-white/60">
            {paid.length} cobros {pending > 0 && <span className="text-amber-300">· {fmtMoney(pending)} pendiente</span>}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {byMethod.map((m) => (
            <Card key={m.k} className="p-5">
              <p className="label-xs">{PAY_METHODS[m.k]}</p>
              <p className="mt-2 font-display text-[26px] font-light leading-none">{fmtMoney(m.v)}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-navy" style={{ width: total ? `${(m.v / total) * 100}%` : 0 }} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !rows.length ? (
          <Empty icon={<Wallet />} title="Sin movimientos en este rango" action={<Btn size="sm" onClick={() => setOpen(true)}>Registrar pago</Btn>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Fecha", "Paciente", "Concepto", "Método", "Estado", "Monto", ""].map((h) => (
                    <th key={h} className="label-xs px-5 py-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {fmtDateShort(r.date)} {hm(r.date)}
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/app/pacientes/${r.patientId}`} className="hover:text-navy">
                        {r.patientName}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {r.concept}
                      {r.notes && <span className="block text-[12px] text-muted-foreground">{r.notes}</span>}
                    </td>
                    <td className="px-5 py-3">{PAY_METHODS[r.method]}</td>
                    <td className="px-5 py-3">
                      {r.status === "pagado" ? (
                        <span className="text-success">Pagado</span>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[12px] text-warning hover:bg-amber-100"
                          onClick={async () => {
                            await update.mutateAsync({ id: r.id, status: "pagado" });
                            toast.ok("Marcado como pagado");
                          }}
                        >
                          Pendiente <Check className="size-3" />
                        </button>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-medium">{fmtMoney(r.amount)}</td>
                    <td className="px-3 py-3 text-right print:hidden">
                      <button
                        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-crimson-soft hover:text-crimson"
                        onClick={async () => {
                          if (!confirm("¿Eliminar este movimiento?")) return;
                          await remove.mutateAsync({ id: r.id });
                          toast.ok("Movimiento eliminado");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <PaymentFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
