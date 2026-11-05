import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useProfile() {
  return useQuery(orpc.profile.me.queryOptions());
}
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation(orpc.profile.update.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.profile.key() }) }));
}
