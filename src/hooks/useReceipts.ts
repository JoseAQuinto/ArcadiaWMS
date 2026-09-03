import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as receiptsApi from "@/services/receipts.api";
import { invalidateStockRelated } from "@/lib/queryInvalidation";

export function useReceipts(params: receiptsApi.ReceiptListParams) {
  return useQuery({
    queryKey: ["receipts", "list", params],
    queryFn: () => receiptsApi.fetchReceipts(params),
    placeholderData: (previous) => previous,
  });
}

export function useReceipt(id: number | undefined) {
  return useQuery({
    queryKey: ["receipts", "detail", id],
    queryFn: () => receiptsApi.fetchReceipt(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: receiptsApi.createReceipt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receipts"] }),
  });
}

export function useUpdateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: receiptsApi.UpdateReceiptInput }) =>
      receiptsApi.updateReceipt(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receipts"] }),
  });
}

export function useReceiveLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ receiptId, input }: { receiptId: number; input: receiptsApi.ReceiveLineInput }) =>
      receiptsApi.receiveLine(receiptId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["receipts"] });
      await invalidateStockRelated(queryClient);
    },
  });
}
