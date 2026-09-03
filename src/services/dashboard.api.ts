import { apiRequest } from "./api";
import type { DashboardSummary } from "@/types/dashboard";

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/api/dashboard");
}
