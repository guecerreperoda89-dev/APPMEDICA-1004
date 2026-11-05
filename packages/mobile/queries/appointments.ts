import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: orpc.appointments.key() }),
      qc.invalidateQueries({ queryKey: orpc.reports.key() }),
      qc.invalidateQueries({ queryKey: orpc.patients.key() }),
    ]);
}

export function useAppointments(from: string, to: string) {
  return useQuery(orpc.appointments.range.queryOptions({ input: { from, to } }));
}
export function useSlots(date: string) {
  return useQuery(orpc.appointments.slots.queryOptions({ input: { date } }));
}
export function useCreateAppointment() {
  const inv = useInvalidate();
  return useMutation(orpc.appointments.create.mutationOptions({ onSuccess: inv }));
}
export function useUpdateAppointment() {
  const inv = useInvalidate();
  return useMutation(orpc.appointments.update.mutationOptions({ onSuccess: inv }));
}
export function useRemind() {
  const inv = useInvalidate();
  return useMutation(orpc.appointments.remind.mutationOptions({ onSuccess: inv }));
}

export function useAppointment(id: number) {
  return useQuery(orpc.appointments.get.queryOptions({ input: { id }, enabled: id > 0 }));
}
export function useCreatePayment() {
  const inv = useInvalidate();
  return useMutation(orpc.payments.create.mutationOptions({ onSuccess: inv }));
}
