import { apiRequest } from "./api";
import type { LoginResult, User } from "@/types/auth";

export function login(identifier: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>("/api/auth/login", { method: "POST", body: { identifier, password } });
}

export function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>("/api/auth/me");
}
