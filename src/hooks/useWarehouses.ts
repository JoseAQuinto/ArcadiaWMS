import { useQuery } from "@tanstack/react-query";
import { fetchWarehouses } from "@/services/warehouses.api";

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: fetchWarehouses,
    staleTime: 5 * 60 * 1000,
  });
}
