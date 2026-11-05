import type { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../database";
import * as s from "../database/schema";
import { certificatePdf, prescriptionPdf } from "../lib/pdf";
import { appUrl } from "../lib/helpers";

/** PDFs públicos por código de verificación (no adivinable). */
export function registerPdfRoutes(app: Hono<any>) {
  app.get("/api/pdf/:kind/:code", async (c) => {
    const kind = c.req.param("kind");
    const code = c.req.param("code").toUpperCase();
    const origin = appUrl() || new URL(c.req.url).origin;
    const verifyUrl = `${origin}/verificar/${code}`;
    try {
      if (kind === "receta") {
        const [rx] = await db.select().from(s.prescriptions).where(eq(s.prescriptions.code, code));
        if (!rx) return c.text("Documento no encontrado", 404);
        const [p] = await db.select().from(s.patients).where(eq(s.patients.id, rx.patientId));
        const [d] = await db.select().from(s.doctorProfiles).where(eq(s.doctorProfiles.userId, rx.doctorId));
        const bytes = await prescriptionPdf(d, p, rx, verifyUrl);
        return new Response(bytes as unknown as BodyInit, {
          status: 200,
          headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="receta-${code}.pdf"` },
        });
      }
      if (kind === "certificado") {
        const [ct] = await db.select().from(s.certificates).where(eq(s.certificates.code, code));
        if (!ct) return c.text("Documento no encontrado", 404);
        const [p] = await db.select().from(s.patients).where(eq(s.patients.id, ct.patientId));
        const [d] = await db.select().from(s.doctorProfiles).where(eq(s.doctorProfiles.userId, ct.doctorId));
        const bytes = await certificatePdf(d, p, ct, verifyUrl);
        return new Response(bytes as unknown as BodyInit, {
          status: 200,
          headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="certificado-${code}.pdf"` },
        });
      }
      return c.text("Tipo no válido", 400);
    } catch (e) {
      console.error(e);
      return c.text("Error generando PDF", 500);
    }
  });
}
