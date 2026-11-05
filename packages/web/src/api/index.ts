import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { ping } from "./routes/ping";
import { auth } from "./auth";
import { profile } from "./routes/profile";
import { patients } from "./routes/patients";
import { appointments } from "./routes/appointments";
import { consultations } from "./routes/consultations";
import { prescriptions } from "./routes/prescriptions";
import { certificates } from "./routes/certificates";
import { payments } from "./routes/payments";
import { reports } from "./routes/reports";
import { pub } from "./routes/pub";
import { registerPdfRoutes } from "./services/pdf-http";
import { startReminderScheduler } from "./services/notifications";

export const router = {
  ping,
  profile,
  patients,
  appointments,
  consultations,
  prescriptions,
  certificates,
  payments,
  reports,
  pub,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
registerPdfRoutes(app);
startReminderScheduler();

export default app;
