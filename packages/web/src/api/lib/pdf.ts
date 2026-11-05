import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import QRCode from "qrcode";
import { LOGO_JPG_BASE64 } from "./logo-data";
import type * as s from "../database/schema";
import { ageFrom, CERT_TYPES, fmtDateLong, hm, numberToWords } from "../../shared/utils";

type Profile = typeof s.doctorProfiles.$inferSelect;
type Patient = typeof s.patients.$inferSelect;
type Rx = typeof s.prescriptions.$inferSelect;
type Cert = typeof s.certificates.$inferSelect;

const NAVY = rgb(31 / 255, 50 / 255, 99 / 255);
const RED = rgb(165 / 255, 28 / 255, 48 / 255);
const INK = rgb(0.09, 0.11, 0.18);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.88, 0.89, 0.92);

/** Helvetica estándar = WinAnsi: limpia caracteres fuera de rango */
function clean(t: string | null | undefined): string {
  return (t ?? "")
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\t/g, " ")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}

async function fetchImage(doc: PDFDocument, url?: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf[0] === 0x89 && buf[1] === 0x50) return await doc.embedPng(buf);
    if (buf[0] === 0xff && buf[1] === 0xd8) return await doc.embedJpg(buf);
    return null;
  } catch {
    return null;
  }
}

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  W: number;
  H: number;
  M: number;
}

async function setup(): Promise<Ctx> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, page, font, bold, y: 841.89, W: 595.28, H: 841.89, M: 48 };
}

async function header(c: Ctx, p: Profile, docTitle: string, code: string, date: Date) {
  const { page, W, M, bold, font } = c;
  const logo = await c.doc.embedJpg(Uint8Array.from(atob(LOGO_JPG_BASE64), (ch) => ch.charCodeAt(0)));
  const lw = 150;
  const lh = (logo.height / logo.width) * lw;
  page.drawRectangle({ x: 0, y: c.H - 6, width: W, height: 6, color: NAVY });
  page.drawRectangle({ x: 0, y: c.H - 6, width: W * 0.18, height: 6, color: RED });
  page.drawImage(logo, { x: M - 6, y: c.H - 30 - lh, width: lw, height: lh });

  // datos médico a la derecha
  const rx = W - M;
  let yy = c.H - 42;
  const right = (t: string, f: PDFFont, sz: number, col = INK) => {
    const tt = clean(t);
    page.drawText(tt, { x: rx - f.widthOfTextAtSize(tt, sz), y: yy, size: sz, font: f, color: col });
    yy -= sz + 4;
  };
  right(`${p.title} ${p.fullName}`, bold, 12, NAVY);
  right(p.specialty, font, 9.5, RED);
  if (p.senescytReg) right(`Reg. SENESCYT: ${p.senescytReg}`, font, 8.5, MUTED);
  if (p.acessReg) right(`Reg. ACESS / MSP: ${p.acessReg}`, font, 8.5, MUTED);
  const contact = [p.phone, p.email].filter(Boolean).join("  ·  ");
  if (contact) right(contact, font, 8.5, MUTED);
  if (p.address) right(`${p.address}${p.city ? `, ${p.city}` : ""}`, font, 8.5, MUTED);

  c.y = Math.min(c.H - 30 - lh, yy) - 18;
  page.drawLine({ start: { x: M, y: c.y }, end: { x: W - M, y: c.y }, thickness: 0.8, color: LINE });
  c.y -= 26;
  page.drawText(clean(docTitle.toUpperCase()), { x: M, y: c.y, size: 15, font: bold, color: NAVY });
  const meta = clean(`N.º ${code}   ·   ${p.city || "Ecuador"}, ${fmtDateLong(date)}`);
  page.drawText(meta, { x: W - M - font.widthOfTextAtSize(meta, 8.5), y: c.y + 3, size: 8.5, font, color: MUTED });
  c.y -= 20;
}

function patientBox(c: Ctx, pt: Patient) {
  const { page, M, W, bold } = c;
  const h = 46;
  page.drawRectangle({ x: M, y: c.y - h, width: W - 2 * M, height: h, color: rgb(0.965, 0.97, 0.98), borderColor: LINE, borderWidth: 0.6 });
  const age = ageFrom(pt.birthDate);
  const cols: [string, string][] = [
    ["PACIENTE", `${pt.lastName} ${pt.firstName}`],
    [pt.idType === "pasaporte" ? "PASAPORTE" : "CÉDULA", pt.idNumber],
    ["EDAD", age !== null ? `${age} años` : "-"],
    ["SEXO", pt.sex === "M" ? "Masculino" : pt.sex === "F" ? "Femenino" : "Otro"],
  ];
  const widths = [0.44, 0.22, 0.14, 0.2];
  let x = M + 12;
  cols.forEach(([k, v], i) => {
    page.drawText(clean(k), { x, y: c.y - 16, size: 7, font: bold, color: MUTED });
    page.drawText(clean(v).slice(0, 44), { x, y: c.y - 32, size: 10.5, font: bold, color: INK });
    x += (W - 2 * M - 24) * widths[i];
  });
  c.y -= h + 18;
}

function sectionTitle(c: Ctx, t: string) {
  c.page.drawText(clean(t.toUpperCase()), { x: c.M, y: c.y, size: 8, font: c.bold, color: RED });
  c.y -= 14;
}

function paragraph(c: Ctx, t: string, size = 10, indent = 0, f?: PDFFont, color = INK) {
  const lines = wrap(t, f ?? c.font, size, c.W - 2 * c.M - indent);
  for (const l of lines) {
    c.page.drawText(l, { x: c.M + indent, y: c.y, size, font: f ?? c.font, color });
    c.y -= size + 4;
  }
}

async function footer(c: Ctx, p: Profile, code: string, verifyUrl: string) {
  const { page, doc, M, W, font, bold } = c;
  const baseY = 70;
  // firma + sello
  const sig = await fetchImage(doc, p.signatureUrl);
  const stamp = await fetchImage(doc, p.stampUrl);
  const cx = W / 2 + 40;
  if (stamp) {
    const sw = 105;
    const sh = Math.min((stamp.height / stamp.width) * sw, 105);
    page.drawImage(stamp, { x: cx + 70, y: baseY + 30, width: (stamp.width / stamp.height) * sh, height: sh, opacity: 0.9 });
  }
  if (sig) {
    const sw = 150;
    const sh = Math.min((sig.height / sig.width) * sw, 70);
    page.drawImage(sig, { x: cx - ((sig.width / sig.height) * sh) / 2, y: baseY + 44, width: (sig.width / sig.height) * sh, height: sh });
  }
  page.drawLine({ start: { x: cx - 100, y: baseY + 40 }, end: { x: cx + 100, y: baseY + 40 }, thickness: 0.8, color: INK });
  const n = clean(`${p.title} ${p.fullName}`);
  page.drawText(n, { x: cx - bold.widthOfTextAtSize(n, 10) / 2, y: baseY + 26, size: 10, font: bold, color: NAVY });
  const sub = clean([p.specialty, p.cedula ? `C.I. ${p.cedula}` : ""].filter(Boolean).join(" · "));
  page.drawText(sub, { x: cx - font.widthOfTextAtSize(sub, 8) / 2, y: baseY + 14, size: 8, font, color: MUTED });
  if (p.senescytReg) {
    const r = clean(`Reg. ${p.senescytReg}`);
    page.drawText(r, { x: cx - font.widthOfTextAtSize(r, 8) / 2, y: baseY + 3, size: 8, font, color: MUTED });
  }

  // QR verificación
  const qrData = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 220, color: { dark: "#1F3263", light: "#FFFFFF" } });
  const qr = await doc.embedPng(Uint8Array.from(atob(qrData.split(",")[1]), (ch) => ch.charCodeAt(0)));
  page.drawImage(qr, { x: M, y: baseY, width: 62, height: 62 });
  page.drawText("Verifique la autenticidad", { x: M + 72, y: baseY + 44, size: 8, font: bold, color: NAVY });
  page.drawText(clean(`Código: ${code}`), { x: M + 72, y: baseY + 32, size: 8, font, color: MUTED });
  const vu = clean(verifyUrl.replace(/^https?:\/\//, ""));
  page.drawText(vu.length > 46 ? vu.slice(0, 46) + "..." : vu, { x: M + 72, y: baseY + 20, size: 7, font, color: MUTED });

  page.drawLine({ start: { x: M, y: 46 }, end: { x: W - M, y: 46 }, thickness: 0.6, color: LINE });
  page.drawText("SINCRONIA · Cardiología Integral", { x: M, y: 32, size: 7.5, font: bold, color: NAVY });
  const legal = "Documento generado electrónicamente. Válido con firma y sello del profesional.";
  page.drawText(clean(legal), { x: W - M - font.widthOfTextAtSize(clean(legal), 7), y: 32, size: 7, font, color: MUTED });
  page.drawRectangle({ x: 0, y: 0, width: W, height: 5, color: NAVY });
}

function diagLines(diags: { code: string; name: string; kind: string }[]) {
  return diags.map((d) => `${d.code ? d.code + " - " : ""}${d.name}${d.kind ? ` (${d.kind})` : ""}`);
}

export async function prescriptionPdf(p: Profile, pt: Patient, rx: Rx, verifyUrl: string) {
  const c = await setup();
  await header(c, p, "Receta médica", rx.code, rx.date);
  patientBox(c, pt);
  if (pt.allergies) {
    c.page.drawText(clean(`ALERGIAS: ${pt.allergies}`).slice(0, 110), { x: c.M, y: c.y, size: 8.5, font: c.bold, color: RED });
    c.y -= 18;
  }
  if (rx.diagnoses.length) {
    sectionTitle(c, "Diagnóstico (CIE-10)");
    for (const l of diagLines(rx.diagnoses)) paragraph(c, l, 9.5);
    c.y -= 8;
  }

  // Rp
  c.page.drawText("Rp.", { x: c.M, y: c.y - 4, size: 20, font: c.bold, color: NAVY });
  c.y -= 30;
  rx.items.forEach((it, i) => {
    const title = `${i + 1}. ${it.genericName}${it.concentration ? ` ${it.concentration}` : ""}${it.form ? ` - ${it.form}` : ""}`;
    paragraph(c, title, 11, 8, c.bold);
    paragraph(c, `Cantidad: ${it.quantity} (${it.quantityWords || numberToWords(it.quantity)})${it.route ? `   ·   Vía: ${it.route}` : ""}`, 9.5, 20, c.font, MUTED);
    c.y -= 6;
  });

  c.y -= 6;
  c.page.drawLine({ start: { x: c.M, y: c.y }, end: { x: c.W - c.M, y: c.y }, thickness: 0.6, color: LINE, dashArray: [3, 3] });
  c.y -= 20;
  c.page.drawText("INDICACIONES", { x: c.M, y: c.y, size: 11, font: c.bold, color: NAVY });
  c.y -= 18;
  rx.items.forEach((it, i) => {
    paragraph(c, `${i + 1}. ${it.genericName}${it.concentration ? ` ${it.concentration}` : ""}`, 10, 8, c.bold);
    const posology = [it.dose, it.frequency, it.duration ? `durante ${it.duration}` : ""].filter(Boolean).join(", ");
    if (posology) paragraph(c, posology, 9.5, 20);
    if (it.instructions) paragraph(c, it.instructions, 9.5, 20, c.font, MUTED);
    c.y -= 4;
  });
  if (rx.recommendations) {
    c.y -= 6;
    sectionTitle(c, "Recomendaciones");
    paragraph(c, rx.recommendations, 9.5);
  }
  if (rx.warningSigns) {
    c.y -= 6;
    sectionTitle(c, "Signos de alarma");
    paragraph(c, rx.warningSigns, 9.5);
  }
  if (rx.nextVisit) {
    c.y -= 6;
    paragraph(c, `Próximo control: ${fmtDateLong(rx.nextVisit)}`, 9.5, 0, c.bold, NAVY);
  }
  await footer(c, p, rx.code, verifyUrl);
  return c.doc.save();
}

export async function certificatePdf(p: Profile, pt: Patient, cert: Cert, verifyUrl: string) {
  const c = await setup();
  await header(c, p, CERT_TYPES[cert.type] ?? "Certificado médico", cert.code, cert.date);
  c.y -= 10;
  const dr = `${p.title} ${p.fullName}`;
  const ptName = `${pt.firstName} ${pt.lastName}`;
  const idLabel = pt.idType === "pasaporte" ? "pasaporte" : "cédula de ciudadanía";
  const age = ageFrom(pt.birthDate);
  const ageTxt = age !== null ? `, de ${age} años de edad` : "";
  const intro = `Yo, ${dr}, ${p.specialty}${p.senescytReg ? `, con registro SENESCYT ${p.senescytReg}` : ""}, en legal y debida forma CERTIFICO que:`;
  paragraph(c, intro, 11, 0, c.font);
  c.y -= 10;

  let body = "";
  if (cert.type === "reposo") {
    const days = cert.restDays ?? 1;
    body = `El/la paciente ${ptName}, con ${idLabel} N.º ${pt.idNumber}${ageTxt}, fue atendido/a en consulta el ${fmtDateLong(cert.date)}, y requiere REPOSO MÉDICO por ${days} (${numberToWords(days)}) día${days === 1 ? "" : "s"}${cert.startDate ? `, desde el ${fmtDateLong(cert.startDate)}` : ""}${cert.endDate ? ` hasta el ${fmtDateLong(cert.endDate)}` : ""}, inclusive.`;
  } else if (cert.type === "asistencia") {
    body = `El/la paciente ${ptName}, con ${idLabel} N.º ${pt.idNumber}${ageTxt}, acudió a consulta médica el ${fmtDateLong(cert.date)}${cert.timeFrom ? `, desde las ${cert.timeFrom}` : ""}${cert.timeTo ? ` hasta las ${cert.timeTo}` : ""}${cert.institution ? `, para ser presentado en ${cert.institution}` : ""}.`;
  } else {
    body = `Se ha realizado la valoración médica al/a la Sr./Sra. ${ptName}, con ${idLabel} N.º ${pt.idNumber}${ageTxt}, y a la fecha del examen (${fmtDateLong(cert.date)}) se encuentra en buen estado de salud general, sin evidencia clínica de enfermedad infectocontagiosa ni limitación física aparente para realizar sus actividades habituales${cert.institution ? ` en ${cert.institution}` : ""}.`;
  }
  paragraph(c, body, 11);
  c.y -= 12;
  if (cert.diagnoses.length && cert.type !== "salud") {
    sectionTitle(c, "Diagnóstico (CIE-10)");
    for (const l of diagLines(cert.diagnoses)) paragraph(c, l, 10);
    c.y -= 10;
  }
  if (cert.observations) {
    sectionTitle(c, "Observaciones");
    paragraph(c, cert.observations, 10);
    c.y -= 10;
  }
  c.y -= 6;
  paragraph(c, "Es todo cuanto puedo certificar en honor a la verdad, autorizando al/a la interesado/a hacer uso del presente documento como estime conveniente, salvo en asuntos judiciales.", 10, 0, c.font, MUTED);
  c.y -= 8;
  paragraph(c, `${p.city || "Ecuador"}, ${fmtDateLong(cert.date)} · Emitido a las ${hm(cert.createdAt)}`, 9, 0, c.font, MUTED);
  await footer(c, p, cert.code, verifyUrl);
  return c.doc.save();
}
