import * as React from "react";
import { Link, Redirect, useLocation } from "wouter";
import { authClient } from "../lib/auth";
import { Btn, Field, Input } from "../components/ui/kit";
import { cn } from "../lib/utils";

export default function SignIn() {
  const { data: session, isPending } = authClient.useSession();
  const [, nav] = useLocation();
  const [mode, setMode] = React.useState<"in" | "up">("in");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [gLoading, setGLoading] = React.useState(false);

  if (!isPending && session) return <Redirect to="/app" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res =
      mode === "in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });
    setLoading(false);
    if (res.error) {
      const m = res.error.message ?? "";
      setError(
        /invalid email or password/i.test(m)
          ? "Email o contraseña incorrectos"
          : /already exists/i.test(m)
            ? "Ya existe una cuenta con este email"
            : /password.*short/i.test(m)
              ? "La contraseña debe tener al menos 8 caracteres"
              : m || "No se pudo continuar",
      );
      return;
    }
    nav("/app");
  }

  async function google() {
    setError("");
    setGLoading(true);
    const r = await authClient.managedAuth.signIn({ provider: "google" });
    setGLoading(false);
    if (r.error && r.error.code !== "POPUP_CLOSED") setError(r.error.message ?? "Error con Google");
    else if (!r.error) nav("/app");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="iridescent iridescent-animated relative hidden overflow-hidden lg:block">
        <div className="sheen absolute -left-1/4 top-1/3 h-40 w-[150%] rotate-[-12deg]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/">
            <img src="/images/logo.png" alt="SINCRONIA" className="h-14" />
          </Link>
          <div>
            <p className="mb-6 max-w-sm text-[15px] leading-relaxed text-ink/70">
              Agenda, historia clínica, recetas y certificados con firma digital. Todo en un solo lugar, para cada médico del centro.
            </p>
            <h1 className="font-display text-[118px] font-extralight leading-[0.85] tracking-[-0.05em] text-ink">
              sincro<span className="text-navy/40">nia</span>
            </h1>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="mb-10 block lg:hidden">
            <img src="/images/logo.png" alt="SINCRONIA" className="h-12" />
          </Link>
          <p className="label-xs mb-3">Acceso médicos</p>
          <h2 className="mb-8 font-display text-[44px] font-extralight leading-none tracking-[-0.03em]">
            {mode === "in" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          </h2>
          <div className="mb-6 inline-flex rounded-full border border-border p-1">
            {(["in", "up"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={cn("rounded-full px-5 py-1.5 text-[13px] transition", mode === m ? "bg-ink text-white" : "text-muted-foreground")}
              >
                {m === "in" ? "Ingresar" : "Registrarme"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === "up" && (
              <Field label="Nombre completo">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="María Fernanda Andrade" />
              </Field>
            )}
            <Field label="Email">
              <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctora@sincronia.ec" />
            </Field>
            <Field label="Contraseña">
              <Input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </Field>
            {error && <p className="rounded-xl bg-crimson-soft px-4 py-2.5 text-[13px] text-crimson">{error}</p>}
            <Btn type="submit" size="lg" loading={loading} arrow className="mt-2">
              {mode === "in" ? "Ingresar" : "Crear cuenta"}
            </Btn>
          </form>
          <div className="my-6 flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
          </div>
          <Btn variant="outline" size="lg" className="w-full" onClick={google} loading={gLoading}>
            <svg viewBox="0 0 24 24" className="size-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continuar con Google
          </Btn>
          <p className="mt-8 text-center text-[12.5px] text-muted-foreground">
            ¿Eres paciente?{" "}
            <Link to="/reservar" className="text-navy underline underline-offset-4">
              Agenda tu cita aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
