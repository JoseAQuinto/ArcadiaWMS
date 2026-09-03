import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as locationsApi from "@/services/locations.api";

export function useLocations(params: locationsApi.LocationListParams = {}) {
  return useQuery({
    queryKey: ["locations", "list", params],
    queryFn: () => locationsApi.fetchLocations(params),
  });
}

export function useLocation(id: number | undefined) {
  return useQuery({
    queryKey: ["locations", "detail", id],
    queryFn: () => locationsApi.fetchLocation(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createLocation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof locationsApi.updateLocation>[1] }) =>
      locationsApi.updateLocation(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
}
