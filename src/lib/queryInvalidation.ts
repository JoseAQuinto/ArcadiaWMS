import type { QueryClient } from "@tanstack/react-query";

/** Anything that changes stock quantities touches these query families. */
export function invalidateStockRelated(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["stock"] }),
    queryClient.invalidateQueries({ queryKey: ["items"] }),
    queryClient.invalidateQueries({ queryKey: ["locations"] }),
    queryClient.invalidateQueries({ queryKey: ["movements"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  ]);
}
