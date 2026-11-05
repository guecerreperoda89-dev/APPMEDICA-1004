import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "../lib/api";

export const useProfile = () => useQuery(orpc.profile.me.queryOptions({ staleTime: 60_000 }));
export const useSchedules = () => useQuery(orpc.profile.schedules.queryOptions());
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation(orpc.profile.update.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.profile.key() }) }));
}
export function useSetSchedules() {
  const qc = useQueryClient();
  return useMutation(orpc.profile.setSchedules.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.profile.schedules.key() }) }));
}
export async function uploadFile(file: File) {
  const { url, publicUrl } = await client.profile.presign({ filename: file.name, contentType: file.type });
  const r = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type, "x-amz-acl": "public-read" } });
  if (!r.ok) throw new Error("No se pudo subir el archivo");
  return publicUrl;
}
