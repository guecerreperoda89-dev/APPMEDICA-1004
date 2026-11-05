import * as React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type Toast = { id: number; kind: "ok" | "error" | "info"; text: string };
const Ctx = React.createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const push = React.useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-[13px] text-white shadow-xl animate-in slide-in-from-bottom-2 fade-in">
            {t.kind === "ok" ? <CheckCircle2 className="size-4 text-emerald-300" /> : t.kind === "error" ? <AlertCircle className="size-4 text-rose-300" /> : <Info className="size-4 text-sky-300" />}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const push = React.useContext(Ctx);
  return React.useMemo(
    () => ({
      ok: (t: string) => push("ok", t),
      error: (e: unknown) => push("error", e instanceof Error ? e.message : typeof e === "string" ? e : "Ocurrió un error"),
      info: (t: string) => push("info", t),
    }),
    [push],
  );
}
