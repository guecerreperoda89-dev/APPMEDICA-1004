import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const useDashboard = () => useQuery(orpc.reports.dashboard.queryOptions());
export const useReport = (from: string, to: string) =>
  useQuery(orpc.reports.summary.queryOptions({ input: { from, to }, placeholderData: keepPreviousData }));
