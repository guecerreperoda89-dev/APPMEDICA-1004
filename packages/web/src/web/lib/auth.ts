import { createAuthClient } from "better-auth/react";
import { managedAuthClient } from "@runablehq/managed-auth/client";

const config = {
  applicationId: import.meta.env.VITE_APPLICATION_ID,
  issuer: import.meta.env.VITE_RUNABLE_AUTH_ISSUER,
};

/** Misma clave que usa managed-auth, así email/contraseña y Google comparten el bearer. */
const TOKEN_KEY = "runable.managed-auth.token";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_WEBSITE_URL ?? window.location.origin,
  basePath: "/api/auth",
  plugins: [managedAuthClient(config)],
  fetchOptions: {
    onSuccess(ctx) {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) localStorage.setItem(TOKEN_KEY, token);
    },
  },
});

/** Completa un posible retorno de login gestionado antes de montar rutas protegidas. */
export const authReady: Promise<void> = authClient.managedAuth
  .handleRedirect()
  .then(() => undefined)
  .catch(() => undefined);
