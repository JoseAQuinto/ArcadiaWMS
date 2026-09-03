import { apiRequest } from "./api";
import type { Location, LocationDetail, LocationStatus } from "@/types/location";

export interface LocationListParams {
  warehouseId?: number;
  zone?: string;
  status?: LocationStatus;
  search?: string;
}

export function fetchLocations(params: LocationListParams = {}): Promise<Location[]> {
  return apiRequest<Location[]>("/api/locations", { query: params });
}

export function fetchLocation(id: number): Promise<LocationDetail> {
  return apiRequest<LocationDetail>(`/api/locations/${id}`);
}

export interface LocationInput {
  warehouseId: number;
  code: string;
  zone: string;
  capacity?: number | null;
  blocked?: boolean;
}

export function createLocation(input: LocationInput): Promise<Location> {
  return apiRequest<Location>("/api/locations", { method: "POST", body: input });
}

export function updateLocation(
  id: number,
  input: Partial<Pick<LocationInput, "zone" | "capacity" | "blocked">> & { active?: boolean }
): Promise<Location> {
  return apiRequest<Location>(`/api/locations/${id}`, { method: "PUT", body: input });
}
