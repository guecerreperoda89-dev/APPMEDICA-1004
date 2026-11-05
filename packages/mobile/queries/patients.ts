import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function usePatients(q: string) {
  return useQuery(orpc.patients.list.queryOptions({ input: { q: q || undefined } }));
}
export function usePatient(id: number) {
  return useQuery(orpc.patients.get.queryOptions({ input: { id }, enabled: id > 0 }));
}
export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation(
    orpc.patients.create.mutationOptions({
      onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: orpc.patients.key() }), qc.invalidateQueries({ queryKey: orpc.reports.key() })]),
    }),
  );
}
