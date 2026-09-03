import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as itemsApi from "@/services/items.api";

export function useItems(params: itemsApi.ItemListParams) {
  return useQuery({
    queryKey: ["items", "list", params],
    queryFn: () => itemsApi.fetchItems(params),
    placeholderData: (previous) => previous,
  });
}

export function useItem(id: number | undefined) {
  return useQuery({
    queryKey: ["items", "detail", id],
    queryFn: () => itemsApi.fetchItem(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: itemsApi.createItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof itemsApi.updateItem>[1] }) =>
      itemsApi.updateItem(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}
