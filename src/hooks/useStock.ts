import { useQuery } from "@tanstack/react-query";
import * as stockApi from "@/services/stock.api";

export function useStock(params: stockApi.StockListParams) {
  return useQuery({
    queryKey: ["stock", "list", params],
    queryFn: () => stockApi.fetchStock(params),
    placeholderData: (previous) => previous,
  });
}

export function useStockByItem(itemId: number | undefined) {
  return useQuery({
    queryKey: ["stock", "byItem", itemId],
    queryFn: () => stockApi.fetchStockByItem(itemId as number),
    enabled: itemId !== undefined,
  });
}
