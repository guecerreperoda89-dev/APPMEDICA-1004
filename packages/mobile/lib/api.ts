import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@template/web";
import { apiOrigin, getToken } from "./auth";

const link = new RPCLink({
  url: `${apiOrigin}/api/rpc`,
  headers: () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

/** Direct typed client: await client.ping() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.ping.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);

/** URL absoluta de un PDF (receta / certificado). */
export const pdfUrl = (kind: "receta" | "certificado", code: string) => `${apiOrigin}/api/pdf/${kind}/${code}`;

/** Mensaje legible de un error de oRPC / red. */
export function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Ocurrió un error";
}
