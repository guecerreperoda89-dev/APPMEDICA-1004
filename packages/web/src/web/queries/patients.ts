import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const usePatients = (q?: string) =>
  useQuery(orpc.patients.list.queryOptions({ input: { q }, placeholderData: keepPreviousData }));
export const usePatient = (id: number) => useQuery(orpc.patients.get.queryOptions({ input: { id }, enabled: !!id }));

function useInv() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.patients.key() });
    qc.invalidateQueries({ queryKey: orpc.reports.key() });
  };
}
export function useCreatePatient() {
  const inv = useInv();
  return useMutation(orpc.patients.create.mutationOptions({ onSuccess: inv }));
}
export function useUpdatePatient() {
  const inv = useInv();
  return useMutation(orpc.patients.update.mutationOptions({ onSuccess: inv }));
}
export function useRemovePatient() {
  const inv = useInv();
  return useMutation(orpc.patients.remove.mutationOptions({ onSuccess: inv }));
}
