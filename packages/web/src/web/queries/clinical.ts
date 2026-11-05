import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const useCie10 = (q: string) => useQuery(orpc.consultations.cie10.queryOptions({ input: { q }, staleTime: Infinity }));
export const useConsultation = (id: number) => useQuery(orpc.consultations.get.queryOptions({ input: { id }, enabled: !!id }));

function useInv() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.patients.key() });
    qc.invalidateQueries({ queryKey: orpc.consultations.key() });
    qc.invalidateQueries({ queryKey: orpc.prescriptions.key() });
    qc.invalidateQueries({ queryKey: orpc.certificates.key() });
    qc.invalidateQueries({ queryKey: orpc.appointments.key() });
    qc.invalidateQueries({ queryKey: orpc.reports.key() });
  };
}
export function useSaveConsultation() {
  const inv = useInv();
  return {
    create: useMutation(orpc.consultations.create.mutationOptions({ onSuccess: inv })),
    update: useMutation(orpc.consultations.update.mutationOptions({ onSuccess: inv })),
    remove: useMutation(orpc.consultations.remove.mutationOptions({ onSuccess: inv })),
  };
}
export const usePrescriptions = () => useQuery(orpc.prescriptions.list.queryOptions());
export const useCertificates = () => useQuery(orpc.certificates.list.queryOptions());
export function usePrescriptionMutations() {
  const inv = useInv();
  return {
    create: useMutation(orpc.prescriptions.create.mutationOptions({ onSuccess: inv })),
    remove: useMutation(orpc.prescriptions.remove.mutationOptions({ onSuccess: inv })),
    email: useMutation(orpc.prescriptions.email.mutationOptions()),
  };
}
export function useCertificateMutations() {
  const inv = useInv();
  return {
    create: useMutation(orpc.certificates.create.mutationOptions({ onSuccess: inv })),
    remove: useMutation(orpc.certificates.remove.mutationOptions({ onSuccess: inv })),
    email: useMutation(orpc.certificates.email.mutationOptions()),
  };
}
