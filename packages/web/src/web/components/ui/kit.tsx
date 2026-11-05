import * as React from "react";
import { Loader2, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Btn({
  variant = "ink",
  size = "md",
  loading,
  arrow,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "ink" | "outline" | "ghost" | "navy" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  arrow?: boolean;
}) {
  const v = {
    ink: "bg-ink text-white hover:bg-navy",
    navy: "bg-navy text-white hover:bg-ink",
    outline: "border border-border bg-white text-ink hover:border-ink/40",
    ghost: "text-ink hover:bg-surface",
    soft: "bg-surface text-ink hover:bg-navy-soft",
    danger: "bg-crimson-soft text-crimson hover:bg-crimson hover:text-white",
  }[variant];
  const s = { sm: "h-8 px-3.5 text-[12.5px]", md: "h-10 px-5 text-[13.5px]", lg: "h-12 px-7 text-[15px]" }[size];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0",
        v,
        s,
        className,
      )}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
      {arrow && !loading && <ArrowUpRight />}
    </button>
  );
}

export function Pill({ className, children, ...p }: React.ComponentProps<"span">) {
  return (
    <span {...p} className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-3 py-1 text-[12px] backdrop-blur", className)}>
      {children}
    </span>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input({ className, ...p }, ref) {
  return (
    <input
      ref={ref}
      {...p}
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-white px-3.5 text-[14px] outline-none transition placeholder:text-muted-foreground/70 focus:border-navy focus:ring-4 focus:ring-navy/8 disabled:bg-surface",
        className,
      )}
    />
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(function Textarea({ className, ...p }, ref) {
  return (
    <textarea
      ref={ref}
      rows={p.rows ?? 3}
      {...p}
      className={cn(
        "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] leading-relaxed outline-none transition placeholder:text-muted-foreground/70 focus:border-navy focus:ring-4 focus:ring-navy/8",
        className,
      )}
    />
  );
});

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(function Select({ className, children, ...p }, ref) {
  return (
    <select
      ref={ref}
      {...p}
      className={cn(
        "h-10 w-full appearance-none rounded-xl border border-border bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236B7280%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_12px_center] bg-no-repeat px-3.5 pr-9 text-[14px] outline-none focus:border-navy focus:ring-4 focus:ring-navy/8",
        className,
      )}
    >
      {children}
    </select>
  );
});

export function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="label-xs">{label}</span>
      {children}
      {error ? <span className="text-[12px] text-crimson">{error}</span> : hint ? <span className="text-[12px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Card({ className, children, ...p }: React.ComponentProps<"div">) {
  return (
    <div {...p} className={cn("rounded-[20px] border border-border bg-white", className)}>
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-navy", className)} />;
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface", className)} />;
}

export function Empty({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && <div className="grid size-12 place-items-center rounded-full bg-navy-soft text-navy [&_svg]:size-5">{icon}</div>}
      <p className="font-display text-xl font-light text-ink">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean | "xl";
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 backdrop-blur-[2px] animate-in fade-in duration-150 sm:items-center sm:p-6">
      <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-[24px]",
          wide === "xl" ? "sm:max-w-5xl" : wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h3 className="font-display text-[22px] font-light leading-tight text-ink">{title}</h3>
            {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-surface">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border bg-surface/50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function PageHeader({ eyebrow, title, actions, children }: { eyebrow?: string; title: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="label-xs mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[40px] font-extralight leading-[0.95] tracking-[-0.035em] text-ink md:text-[56px]">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
