import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const usePublicDoctors = () => useQuery(orpc.pub.doctors.queryOptions());
export const usePublicDoctor = (id: number) => useQuery(orpc.pub.doctor.queryOptions({ input: { id }, enabled: !!id }));
export const useAvailability = (doctorId: number, from?: string) =>
  useQuery(orpc.pub.availability.queryOptions({ input: { doctorId, from, days: 14 }, enabled: !!doctorId }));
export const useBook = () => useMutation(orpc.pub.book.mutationOptions());
export const usePublicAppointment = (token: string) => useQuery(orpc.pub.appointment.queryOptions({ input: { token } }));
export const useSetPublicStatus = () => useMutation(orpc.pub.setStatus.mutationOptions());
export const useVerify = (code: string) => useQuery(orpc.pub.verify.queryOptions({ input: { code }, enabled: !!code }));
