import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const useAppointments = (from: string, to: string) =>
  useQuery(orpc.appointments.range.queryOptions({ input: { from, to }, placeholderData: keepPreviousData }));
export const useSlots = (date: string) => useQuery(orpc.appointments.slots.queryOptions({ input: { date }, enabled: !!date }));

function useInv() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.appointments.key() });
    qc.invalidateQueries({ queryKey: orpc.reports.key() });
    qc.invalidateQueries({ queryKey: orpc.patients.get.key() });
  };
}
export function useCreateAppointment() {
  const inv = useInv();
  return useMutation(orpc.appointments.create.mutationOptions({ onSuccess: inv }));
}
export function useUpdateAppointment() {
  const inv = useInv();
  return useMutation(orpc.appointments.update.mutationOptions({ onSuccess: inv }));
}
export function useRemoveAppointment() {
  const inv = useInv();
  return useMutation(orpc.appointments.remove.mutationOptions({ onSuccess: inv }));
}
export const useRemind = () => useMutation(orpc.appointments.remind.mutationOptions());
