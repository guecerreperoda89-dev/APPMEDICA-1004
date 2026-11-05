import { Link } from "wouter";
import { motion } from "motion/react";
import { ArrowUpRight, ShieldCheck, CalendarCheck2, HeartPulse, FileCheck2 } from "lucide-react";
import { usePublicDoctors } from "../queries/public";
import { Pill, Skeleton } from "../components/ui/kit";
import { fmtMoney } from "../../shared/utils";

const up = (d = 0) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: [0.2, 0.7, 0.2, 1] as const } });

export default function Home() {
  const doctors = usePublicDoctors();
  return (
    <div className="bg-white text-ink">
      {/* HERO */}
      <section className="iridescent iridescent-animated relative overflow-hidden">
        <div className="sheen absolute -left-1/4 top-1/4 h-48 w-[150%] rotate-[-14deg] opacity-80" />
        <div className="sheen absolute -left-1/4 top-2/3 h-24 w-[150%] rotate-[-10deg] opacity-60" />
        <header className="relative z-10 flex items-center justify-between px-5 py-5 md:px-8">
          <Pill className="hidden gap-2 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-crimson" /> Cardiología integral · Ecuador
          </Pill>
          <img src="/images/heart.png" alt="" className="h-9 sm:hidden" />
          <Pill className="hidden md:inline-flex">
            <a href="#medicos">Médicos</a>
            <span className="text-border">|</span>
            <a href="#servicios">Servicios</a>
            <span className="text-border">|</span>
            <Link to="/verificar">Verificar documento</Link>
          </Pill>
          <div className="flex items-center gap-2">
            <Link to="/ingresar" className="hidden rounded-full px-4 py-2 text-[12.5px] text-ink/70 hover:text-ink sm:block">
              Acceso médicos
            </Link>
            <Link to="/reservar" className="inline-flex items-center gap-6 rounded-full bg-ink px-4 py-2 text-[12.5px] text-white hover:bg-navy">
              Agendar cita <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </header>

        <div className="relative z-10 px-5 pb-0 pt-24 md:px-8 md:pt-40">
          <motion.div {...up(0.2)} className="mb-10 ml-auto max-w-[330px] text-[15px] leading-snug text-ink/85 md:mb-4 md:mr-[8%]">
            <HeartPulse className="mb-2 size-4 text-crimson" />
            Atención cardiológica con precisión y calidez: diagnóstico, seguimiento y prevención para cada latido.
          </motion.div>
          <motion.h1
            {...up(0.05)}
            className="select-none font-display text-[23vw] font-light leading-[0.78] tracking-[-0.06em] md:text-[19vw]"
          >
            <span className="text-ink">sincro</span>
            <span className="bg-gradient-to-r from-navy/60 via-[#8FA6D8] to-crimson/40 bg-clip-text text-transparent">nia</span>
          </motion.h1>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="px-5 py-24 md:px-8 md:py-36">
        <motion.p {...up(0.1)} className="max-w-[640px] font-display text-[28px] font-light leading-[1.2] tracking-[-0.02em] md:text-[34px]">
          Un centro médico que se organiza solo: agenda en línea, historia clínica completa y documentos con firma y sello, listos en segundos.
        </motion.p>
      </section>

      {/* SERVICES */}
      <section id="servicios" className="px-5 md:px-8">
        <div className="relative overflow-hidden rounded-[22px] bg-[#0f1a38] px-6 py-16 text-white md:px-14 md:py-24">
          <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(60% 80% at 85% 20%, #2c4a8f 0%, transparent 60%), radial-gradient(50% 70% at 10% 90%, #6b1d2e 0%, transparent 60%)" }} />
          <div className="relative grid gap-12 md:grid-cols-[1.2fr_1fr]">
            <div className="font-display text-[44px] font-extralight leading-[1.02] tracking-[-0.03em] md:text-[72px]">
              Consulta <span className="text-[#F2A7B1]">&</span> prevención
              <br />
              Electrocardiografía
              <br />
              Seguimiento <span className="text-white/50">crónico</span>
            </div>
            <div className="grid content-end gap-6">
              {[
                { i: CalendarCheck2, t: "Reserva en línea 24/7", d: "Elige médico, día y hora. Recibe confirmación y recordatorio por email." },
                { i: FileCheck2, t: "Recetas y certificados", d: "Documentos en PDF con firma, sello y código QR verificable." },
                { i: ShieldCheck, t: "Historia clínica segura", d: "Tu información médica, organizada y privada para tu médico tratante." },
              ].map(({ i: I, t, d }) => (
                <div key={t} className="flex gap-4 border-t border-white/15 pt-5">
                  <I className="mt-0.5 size-5 shrink-0 text-[#F2A7B1]" strokeWidth={1.5} />
                  <div>
                    <p className="text-[15px] font-medium">{t}</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-white/65">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DOCTORS */}
      <section id="medicos" className="px-5 py-24 md:px-8 md:py-32">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 className="font-display text-[56px] font-extralight leading-none tracking-[-0.04em] md:text-[96px]">Nuestros médicos</h2>
          <p className="max-w-[300px] text-[14.5px] leading-snug text-ink/70">Especialistas que trabajan sincronizados para cuidar tu salud cardiovascular.</p>
        </div>
        {doctors.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : !doctors.data?.length ? (
          <p className="text-muted-foreground">Pronto publicaremos la agenda de nuestros médicos.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {doctors.data.map((d, i) => (
              <Link
                key={d.id}
                to={`/reservar/${d.id}`}
                className="group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[22px] border border-border p-6 transition hover:border-ink/30"
              >
                <div className="absolute -right-16 -top-16 size-56 rounded-full opacity-60 blur-2xl transition group-hover:opacity-100" style={{ background: i % 2 ? "#F6E2E7" : "#DFE7FB" }} />
                <div className="relative flex items-start justify-between">
                  <div className="grid size-14 place-items-center rounded-full bg-navy font-display text-xl font-light text-white">
                    {d.fullName.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                  </div>
                  <span className="grid size-10 place-items-center rounded-full border border-border bg-white transition group-hover:bg-ink group-hover:text-white">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="relative">
                  <p className="label-xs mb-2 !text-crimson">{d.specialty}</p>
                  <p className="font-display text-[30px] font-light leading-[1.05] tracking-[-0.02em]">
                    {d.title} {d.fullName}
                  </p>
                  <p className="mt-3 text-[13px] text-muted-foreground">
                    {d.city} · Consulta {fmtMoney(d.consultationFee)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="px-5 pb-10 md:px-8">
        <div className="iridescent relative overflow-hidden rounded-[22px] px-6 py-20 md:px-14">
          <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
            <h3 className="max-w-3xl font-display text-[48px] font-extralight leading-[0.95] tracking-[-0.04em] md:text-[84px]">
              Tu próxima cita, a un clic.
            </h3>
            <Link to="/reservar" className="inline-flex items-center gap-10 rounded-full bg-ink px-6 py-4 text-[14px] text-white hover:bg-navy">
              Agendar ahora <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-start justify-between gap-6 px-5 py-10 text-[12.5px] text-muted-foreground md:flex-row md:items-center md:px-8">
        <img src="/images/logo.png" alt="SINCRONIA" className="h-10" />
        <div className="flex flex-wrap gap-5">
          <Link to="/reservar">Reservar cita</Link>
          <Link to="/verificar">Verificar receta o certificado</Link>
          <Link to="/ingresar">Acceso médicos</Link>
        </div>
        <p>© {new Date().getFullYear()} SINCRONIA · Cardiología Integral</p>
      </footer>
    </div>
  );
}
