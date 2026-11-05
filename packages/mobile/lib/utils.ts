/** Utilidades (copiadas de packages/web/src/shared/utils.ts). Zona horaria: Ecuador (UTC-5). */
export const TZ = "America/Guayaquil";
export const TZ_OFFSET = "-05:00";

/** "2026-11-05" + "09:30" → Date (hora Ecuador) */
export function ecDate(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00${TZ_OFFSET}`);
}

/** Date → "YYYY-MM-DD" en hora de Ecuador */
export function ymd(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p;
}

/** Date → "HH:mm" en hora de Ecuador */
export function hm(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/** Día de la semana (0=domingo) en hora de Ecuador */
export function weekdayEC(d: Date): number {
  return new Date(`${ymd(d)}T12:00:00${TZ_OFFSET}`).getUTCDay();
}

export function addDaysYmd(date: string, days: number): string {
  const d = ecDate(date, "12:00");
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}

export function fmtDateLong(d: Date | string): string {
  const dt = typeof d === "string" ? ecDate(d, "12:00") : d;
  return new Intl.DateTimeFormat("es-EC", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(dt);
}

export function fmtDateShort(d: Date | string): string {
  const dt = typeof d === "string" ? ecDate(d, "12:00") : d;
  return new Intl.DateTimeFormat("es-EC", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(dt);
}

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);
}

export function ageFrom(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const b = ecDate(birthDate, "12:00");
  const now = new Date();
  let age = Number(ymd(now).slice(0, 4)) - Number(birthDate.slice(0, 4));
  const md = ymd(now).slice(5);
  if (md < birthDate.slice(5)) age--;
  return isNaN(b.getTime()) ? null : age;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function minToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Validación de cédula ecuatoriana (módulo 10) */
export function isValidCedula(ced: string): boolean {
  if (!/^\d{10}$/.test(ced)) return false;
  const prov = Number(ced.slice(0, 2));
  if (!((prov >= 1 && prov <= 24) || prov === 30)) return false;
  if (Number(ced[2]) >= 6) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let v = Number(ced[i]) * coef[i];
    if (v >= 10) v -= 9;
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(ced[9]);
}

const UNITS = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

/** Número a letras (español), 0–999999 */
export function numberToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "cero";
  if (n === 100) return "cien";
  if (n < 30) return UNITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    return u ? `${TENS[t]} y ${UNITS[u]}` : TENS[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return r ? `${HUNDREDS[h]} ${numberToWords(r)}` : n === 100 ? "cien" : HUNDREDS[h];
  }
  const th = Math.floor(n / 1000), r = n % 1000;
  const thw = th === 1 ? "mil" : `${numberToWords(th)} mil`;
  return r ? `${thw} ${numberToWords(r)}` : thw;
}

export const APPT_STATUS: Record<string, { label: string; color: string }> = {
  agendada: { label: "Agendada", color: "#1F3263" },
  confirmada: { label: "Confirmada", color: "#2F7D5B" },
  atendida: { label: "Atendida", color: "#6B7280" },
  cancelada: { label: "Cancelada", color: "#A51C30" },
  no_asistio: { label: "No asistió", color: "#B7791F" },
};

export const CERT_TYPES: Record<string, string> = {
  reposo: "Certificado de reposo médico",
  asistencia: "Certificado de asistencia a consulta",
  salud: "Certificado de salud",
};

export const PAY_METHODS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  seguro: "Seguro / convenio",
};

export function bmi(weight?: number | null, heightCm?: number | null): number | null {
  if (!weight || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}
