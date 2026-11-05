import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: orpc.patients.key() }),
      qc.invalidateQueries({ queryKey: orpc.appointments.key() }),
      qc.invalidateQueries({ queryKey: orpc.reports.key() }),
      qc.invalidateQueries({ queryKey: orpc.prescriptions.key() }),
      qc.invalidateQueries({ queryKey: orpc.certificates.key() }),
    ]);
}

export function useCie10(q: string) {
  return useQuery(orpc.consultations.cie10.queryOptions({ input: { q }, enabled: q.trim().length >= 2 }));
}
export function useCreateConsultation() {
  const inv = useInvalidate();
  return useMutation(orpc.consultations.create.mutationOptions({ onSuccess: inv }));
}
export function useCreatePrescription() {
  const inv = useInvalidate();
  return useMutation(orpc.prescriptions.create.mutationOptions({ onSuccess: inv }));
}
export function useCreateCertificate() {
  const inv = useInvalidate();
  return useMutation(orpc.certificates.create.mutationOptions({ onSuccess: inv }));
}
export function useEmailPrescription() {
  return useMutation(orpc.prescriptions.email.mutationOptions());
}
export function useEmailCertificate() {
  return useMutation(orpc.certificates.email.mutationOptions());
}
