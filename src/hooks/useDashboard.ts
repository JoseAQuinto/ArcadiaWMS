import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/services/dashboard.api";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });
}
