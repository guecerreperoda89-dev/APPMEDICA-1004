import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { ToastProvider } from "./toast";
import { authReady } from "../lib/auth";

let ready = false;
void authReady.then(() => (ready = true));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export function Provider({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = React.useState(ready);
  React.useEffect(() => {
    if (!ok) void authReady.then(() => setOk(true));
  }, [ok]);
  if (!ok) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
