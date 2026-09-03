import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as outboundApi from "@/services/outbound.api";
import { invalidateStockRelated } from "@/lib/queryInvalidation";

export function useOutboundOrders(params: outboundApi.OutboundListParams) {
  return useQuery({
    queryKey: ["outbound-orders", "list", params],
    queryFn: () => outboundApi.fetchOutboundOrders(params),
    placeholderData: (previous) => previous,
  });
}

export function useOutboundOrder(id: number | undefined) {
  return useQuery({
    queryKey: ["outbound-orders", "detail", id],
    queryFn: () => outboundApi.fetchOutboundOrder(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateOutboundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: outboundApi.createOutboundOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outbound-orders"] }),
  });
}

export function useUpdateOutboundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: outboundApi.UpdateOutboundOrderInput }) =>
      outboundApi.updateOutboundOrder(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outbound-orders"] }),
  });
}

export function usePickLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: number; input: outboundApi.PickLineInput }) =>
      outboundApi.pickLine(orderId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
      await invalidateStockRelated(queryClient);
    },
  });
}
