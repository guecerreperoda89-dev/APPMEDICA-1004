import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const usePayments = (from: string, to: string) =>
  useQuery(orpc.payments.list.queryOptions({ input: { from, to }, placeholderData: keepPreviousData }));
function useInv() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.payments.key() });
    qc.invalidateQueries({ queryKey: orpc.reports.key() });
    qc.invalidateQueries({ queryKey: orpc.patients.get.key() });
  };
}
export function usePaymentMutations() {
  const inv = useInv();
  return {
    create: useMutation(orpc.payments.create.mutationOptions({ onSuccess: inv })),
    update: useMutation(orpc.payments.update.mutationOptions({ onSuccess: inv })),
    remove: useMutation(orpc.payments.remove.mutationOptions({ onSuccess: inv })),
  };
}
