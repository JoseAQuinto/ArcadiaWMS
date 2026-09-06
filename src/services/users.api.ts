import { apiRequest } from "./api";
import type { ManagedUser } from "@/types/user";
import type { UserRole } from "@/types/auth";
import type { PaginatedResult } from "@/types/api";

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  active?: boolean;
}

export function fetchUsers(params: UserListParams = {}): Promise<PaginatedResult<ManagedUser>> {
  return apiRequest<PaginatedResult<ManagedUser>>("/api/users", { query: params });
}

export interface CreateUserInput {
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
}

export function createUser(input: CreateUserInput): Promise<ManagedUser> {
  return apiRequest<ManagedUser>("/api/users", { method: "POST", body: input });
}

/** The username is immutable: the backend rejects it because live sessions are tied to it. */
export interface UpdateUserInput {
  email?: string;
  fullName?: string;
  role?: UserRole;
  active?: boolean;
  password?: string;
}

export function updateUser(id: number, input: UpdateUserInput): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`/api/users/${id}`, { method: "PUT", body: input });
}
