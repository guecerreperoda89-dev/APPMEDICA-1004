import { createAuthClient } from "better-auth/react";
import { managedAuthExpoClient } from "@runablehq/managed-auth/native";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Identidad gestionada por la plataforma: nunca editar `expo.extra` ni `expo.scheme`.
const extra = Constants.expoConfig?.extra ?? {};
const isWeb = Platform.OS === "web";
/** Misma clave que el almacén del navegador de managed-auth: Google y email comparten el bearer. */
const TOKEN_KEY = "runable.managed-auth.token";
const SECURE_KEY = "runable_managed_auth_token";

export const apiOrigin: string = String(extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export function getToken(): string {
  if (isWeb) return globalThis.localStorage?.getItem(TOKEN_KEY) ?? "";
  try {
    return SecureStore.getItem(SECURE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setToken(token: string) {
  if (isWeb) {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  try {
    if (token) SecureStore.setItem(SECURE_KEY, token);
    else void SecureStore.deleteItemAsync(SECURE_KEY);
  } catch {
    /* sin almacenamiento seguro disponible */
  }
}

export const authClient = createAuthClient({
  baseURL: apiOrigin,
  basePath: "/api/auth",
  plugins: [
    managedAuthExpoClient({
      applicationId: extra.applicationId,
      issuer: extra.runableAuthIssuer,
      storage: { getToken, setToken, clearToken: () => setToken("") },
    }),
  ],
  fetchOptions: {
    ...(isWeb ? { credentials: "omit" as const } : {}),
    auth: { type: "Bearer", token: () => getToken() },
    headers: isWeb ? {} : { "expo-origin": "mobile://" },
    onSuccess(ctx) {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) setToken(token);
    },
  },
});

export async function signOut() {
  try {
    await authClient.signOut();
  } finally {
    setToken("");
  }
}
