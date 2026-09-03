import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as movementsApi from "@/services/movements.api";
import { invalidateStockRelated } from "@/lib/queryInvalidation";

export function useMovements(params: movementsApi.MovementListParams) {
  return useQuery({
    queryKey: ["movements", "list", params],
    queryFn: () => movementsApi.fetchMovements(params),
    placeholderData: (previous) => previous,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: movementsApi.createTransfer,
    onSuccess: () => invalidateStockRelated(queryClient),
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: movementsApi.createAdjustment,
    onSuccess: () => invalidateStockRelated(queryClient),
  });
}
