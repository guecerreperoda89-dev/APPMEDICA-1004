import * as React from "react";
import { Link, Redirect, useLocation } from "wouter";
import {
  LayoutGrid,
  CalendarDays,
  Users,
  Pill as PillIcon,
  FileBadge,
  Wallet,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { authClient } from "../lib/auth";
import { useProfile } from "../queries/profile";
import { cn } from "../lib/utils";
import { Spinner } from "./ui/kit";

const NAV = [
  { to: "/app", label: "Inicio", icon: LayoutGrid },
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/app/pacientes", label: "Pacientes", icon: Users },
  { to: "/app/recetas", label: "Recetas", icon: PillIcon },
  { to: "/app/certificados", label: "Certificados", icon: FileBadge },
  { to: "/app/caja", label: "Caja", icon: Wallet },
  { to: "/app/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/app/perfil", label: "Mi perfil", icon: UserCog },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [loc] = useLocation();
  const [open, setOpen] = React.useState(false);
  const profile = useProfile();
  React.useEffect(() => setOpen(false), [loc]);

  if (isPending)
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  if (!session) return <Redirect to="/ingresar" />;

  const p = profile.data;
  const isActive = (to: string) => (to === "/app" ? loc === "/app" : loc.startsWith(to));

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          className={cn(
            "group flex items-center gap-3 rounded-full px-4 py-2.5 text-[13.5px] transition",
            isActive(n.to) ? "bg-ink text-white" : "text-ink/75 hover:bg-surface hover:text-ink",
          )}
        >
          <n.icon className="size-[17px]" strokeWidth={1.6} />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  const side = (
    <div className="flex h-full flex-col">
      <Link to="/app" className="mb-8 block px-2 pt-1">
        <img src="/images/logo.png" alt="SINCRONIA" className="h-12 w-auto" />
      </Link>
      {nav}
      <div className="mt-auto space-y-3 pt-6">
        <a
          href="/reservar"
          target="_blank"
          className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-[12.5px] text-muted-foreground hover:border-navy/40 hover:text-navy"
        >
          Página de reservas <ExternalLink className="size-3.5" />
        </a>
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-navy font-display text-sm text-white">
            {(p?.fullName ?? session.user.name ?? "M").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">
              {p ? `${p.title} ${p.fullName}` : session.user.name}
            </p>
            <p className="truncate text-[11.5px] text-muted-foreground">{p?.specialty ?? session.user.email}</p>
          </div>
          <button
            title="Cerrar sesión"
            onClick={async () => {
              await authClient.signOut();
              localStorage.removeItem("runable.managed-auth.token");
              window.location.href = "/ingresar";
            }}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-white hover:text-crimson"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-border bg-white px-4 py-6 lg:block">{side}</aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <img src="/images/logo.png" alt="SINCRONIA" className="h-9" />
        <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full border border-border">
          <Menu className="size-4" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink/30 lg:hidden">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[270px] bg-white px-4 py-6 animate-in slide-in-from-left">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white">
              <X className="size-4" />
            </button>
            {side}
          </div>
        </div>
      )}
      <main className="lg:pl-[248px]">
        <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  );
}
